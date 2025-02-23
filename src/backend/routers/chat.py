import logging
from typing import Any, Dict, Generator

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from backend.chat.custom.custom import CustomChat
from backend.config.routers import RouterName
from backend.crud import agent_tool_metadata as agent_tool_metadata_crud
from backend.database_models.database import DBSessionDep
from backend.model_deployments.cohere_platform import CohereDeployment
from backend.schemas.agent import Agent, AgentToolMetadata
from backend.schemas.chat import ChatResponseEvent, NonStreamedChatResponse
from backend.schemas.cohere_chat import CohereChatRequest
from backend.schemas.context import Context
from backend.services.agent import validate_agent_exists
from backend.services.chat import (
    generate_chat_response,
    generate_chat_stream,
    process_chat,
    process_message_regeneration,
)
from backend.services.context import get_context
from backend.services.request_validators import validate_deployment_header

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1",
    tags=[RouterName.CHAT],
)
router.name = RouterName.CHAT


@router.post("/chat-stream", dependencies=[Depends(validate_deployment_header)])
async def chat_stream(
    chat_request: CohereChatRequest,
    session: DBSessionDep,
    ctx: Context = Depends(get_context),
) -> Generator[ChatResponseEvent, Any, None]:
    """
    Stream chat endpoint to handle user messages and return chatbot responses.
    """

    logger.debug(f"Request model dump: {chat_request.model_dump()}")
    ctx.with_model(chat_request.model)
    agent_id = chat_request.agent_id
    ctx.with_agent_id(agent_id)

    (
        session,
        chat_request,
        response_message,
        should_store,
        managed_tools,
        next_message_position,
        ctx,
    ) = process_chat(session, chat_request, ctx)

    logger.info(f"Calling CustomChat().chat with request: {chat_request.model_dump()}")
    return EventSourceResponse(
        generate_chat_stream(
            session,
            CustomChat().chat(
                chat_request,
                stream=True,
                managed_tools=managed_tools,
                session=session,
                ctx=ctx,
            ),
            response_message,
            should_store=should_store,
            next_message_position=next_message_position,
            ctx=ctx,
        ),
        media_type="text/event-stream",
        headers={"Connection": "keep-alive"},
        send_timeout=300,
        ping=5,
    )


@router.post(
    "/chat-stream/regenerate", dependencies=[Depends(validate_deployment_header)]
)
async def regenerate_chat_stream(
    chat_request: CohereChatRequest,
    session: DBSessionDep,
    ctx: Context = Depends(get_context),
) -> EventSourceResponse:
    """
    Endpoint to regenerate stream chat response for the last user message.
    """
    ctx.with_model(chat_request.model)

    agent_id = chat_request.agent_id
    ctx.with_agent_id(agent_id)

    if agent_id:
        agent = validate_agent_exists(session, agent_id, ctx.get_user_id())
        ctx.with_agent(Agent.model_validate(agent))

        agent_tool_metadata = (
            agent_tool_metadata_crud.get_all_agent_tool_metadata_by_agent_id(
                session, agent_id
            )
        )
        agent_tool_metadata_schema = [
            AgentToolMetadata.model_validate(x) for x in agent_tool_metadata
        ]
        ctx.with_agent_tool_metadata(agent_tool_metadata_schema)

    (
        session,
        chat_request,
        new_response_message,
        previous_response_message_ids,
        managed_tools,
        ctx,
    ) = process_message_regeneration(session, chat_request, ctx)

    return EventSourceResponse(
        generate_chat_stream(
            session,
            CustomChat().chat(
                chat_request,
                stream=True,
                managed_tools=managed_tools,
                session=session,
                ctx=ctx,
            ),
            new_response_message,
            next_message_position=new_response_message.position,
            previous_response_message_ids=previous_response_message_ids,
            ctx=ctx,
        ),
        media_type="text/event-stream",
        headers={"Connection": "keep-alive"},
        send_timeout=300,
        ping=5,
    )


@router.post("/chat", dependencies=[Depends(validate_deployment_header)])
async def chat(
    chat_request: CohereChatRequest,
    session: DBSessionDep,
    ctx: Context = Depends(get_context),
) -> NonStreamedChatResponse:
    """
    Chat endpoint to handle user messages and return chatbot responses.
    """
    ctx.with_model(chat_request.model)
    agent_id = chat_request.agent_id
    ctx.with_agent_id(agent_id)
    user_id = ctx.get_user_id()

    if agent_id:
        agent = validate_agent_exists(session, agent_id, user_id)
        agent_schema = Agent.model_validate(agent)
        ctx.with_agent(agent_schema)
        agent_tool_metadata = (
            agent_tool_metadata_crud.get_all_agent_tool_metadata_by_agent_id(
                session, agent_id
            )
        )
        agent_tool_metadata_schema = [
            AgentToolMetadata.model_validate(x) for x in agent_tool_metadata
        ]
        ctx.with_agent_tool_metadata(agent_tool_metadata_schema)

    (
        session,
        chat_request,
        response_message,
        should_store,
        managed_tools,
        next_message_position,
        ctx,
    ) = process_chat(session, chat_request, ctx)

    response = await generate_chat_response(
        session,
        CustomChat().chat(
            chat_request,
            session=session,
            stream=False,
            managed_tools=managed_tools,
            ctx=ctx,
        ),
        response_message,
        should_store=should_store,
        next_message_position=next_message_position,
        ctx=ctx,
    )
    return response


experimental_router = APIRouter(
    prefix="/v1",
    tags=["experimental"],
)


@router.post("/chat-ab-test")
async def chat_ab_test(
    chat_request: CohereChatRequest,
    session: DBSessionDep,
    ctx: Context = Depends(get_context),
) -> Dict[str, Any]:
    """
    Test endpoint that makes two identical chat requests using the same model
    and returns both responses using the full CustomChat workflow.
    """
    try:
        # Set model explicitly if not provided
        if not chat_request.model:
            chat_request.model = "c4ai-aya-expanse-32b"

        if chat_request.model:  # Type check guard
            ctx.with_model(chat_request.model)

        # Process the first chat request
        (
            session,
            chat_request_a,
            response_message_a,
            should_store_a,
            managed_tools_a,
            next_message_position_a,
            ctx_a,
        ) = process_chat(session, chat_request, ctx)

        # Create a deep copy of the original chat request for variant B
        import copy

        chat_request_b = CohereChatRequest(**chat_request.model_dump())

        # Create a new context for variant B with the same key attributes
        ctx_b = Context()
        ctx_b.with_model(chat_request.model)
        ctx_b.with_deployment_name(ctx.get_deployment_name())
        ctx_b.with_user_id(ctx.get_user_id())

        # Generate a trace ID for context B
        import uuid

        ctx_b.with_trace_id(str(uuid.uuid4()))

        # If there's an agent, handle it
        if chat_request.agent_id:
            ctx_b.with_agent_id(chat_request.agent_id)

            # If ctx_a has agent-related data, copy it
            agent = ctx_a.get_agent()
            if agent:
                ctx_b.with_agent(agent)

            agent_tool_metadata = ctx_a.get_agent_tool_metadata()
            if agent_tool_metadata:
                ctx_b.with_agent_tool_metadata(agent_tool_metadata)

        # Process the second chat request
        (
            session_b,
            chat_request_b,
            response_message_b,
            should_store_b,
            managed_tools_b,
            next_message_position_b,
            ctx_b,
        ) = process_chat(session, chat_request_b, ctx_b)

        # Create chat instances for both variants
        chat_a = CustomChat()
        chat_b = CustomChat()

        # Get response for variant A
        response_a = await generate_chat_response(
            session,
            chat_a.chat(
                chat_request_a,
                session=session,
                stream=False,
                managed_tools=managed_tools_a,
                ctx=ctx_a,
            ),
            response_message_a,
            should_store=False,
            next_message_position=next_message_position_a,
            ctx=ctx_a,
        )

        # Get response for variant B
        response_b = await generate_chat_response(
            session_b,
            chat_b.chat(
                chat_request_b,
                session=session_b,
                stream=False,
                managed_tools=managed_tools_b,
                ctx=ctx_b,
            ),
            response_message_b,
            should_store=False,
            next_message_position=next_message_position_b,
            ctx=ctx_b,
        )

        return {
            "variant_a": response_a.model_dump() if response_a else None,
            "variant_b": response_b.model_dump() if response_b else None,
            "model": chat_request.model,
            "success": True,
        }
    except Exception as e:
        import traceback

        return {
            "error": str(e),
            "model": chat_request.model if chat_request.model else "unknown",
            "success": False,
            "stack_trace": traceback.format_exc(),
        }
