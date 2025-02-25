import asyncio
import logging
import uuid
from enum import Enum
from typing import Any, AsyncGenerator, Dict, Generator

from fastapi import APIRouter, Depends, Header
from sse_starlette.sse import EventSourceResponse

from backend.chat.custom.custom import CustomChat
from backend.config.routers import RouterName
from backend.crud import agent_tool_metadata as agent_tool_metadata_crud
from backend.crud import message as message_crud
from backend.database_models.database import DBSessionDep
from backend.database_models.message import MessageAgent
from backend.model_deployments.cohere_platform import CohereDeployment
from backend.schemas.agent import Agent, AgentToolMetadata
from backend.schemas.chat import ChatResponseEvent, NonStreamedChatResponse
from backend.schemas.cohere_chat import CohereChatRequest
from backend.schemas.context import Context
from backend.schemas.message import Message
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


class StreamEvent(Enum):
    STREAM_START = "stream-start"
    STREAM_DATA = "stream-data"
    STREAM_END = "stream-end"


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


@router.post("/chat-human-feedback")
async def chat_human_feedback(
    chat_request: CohereChatRequest,
    session: DBSessionDep,
    ctx: Context = Depends(get_context),
    stream_id: str | None = Header(default=None),
) -> EventSourceResponse:
    """
    Streaming endpoint for chat with human feedback
    """
    import uuid
    import logging

    logger = logging.getLogger(__name__)
    logger.info(f"Starting human feedback chat with stream_id: {stream_id}")

    # Remove human_feedback from the request if it exists
    chat_data = chat_request.model_dump()
    if "human_feedback" in chat_data:
        del chat_data["human_feedback"]

    # Create new request without human_feedback
    chat_request = CohereChatRequest(**chat_data)

    # Add stream identification to context
    ctx.with_stream_id(stream_id)

    # Generate a unique parallel group ID for this pair of responses
    parallel_group_id = str(uuid.uuid4())
    logger.info(f"Created parallel group ID: {parallel_group_id}")

    if not chat_request.model:
        chat_request.model = "c4ai-aya-expanse-32b"

    # Process the chat request
    (
        session,
        chat_request,
        response_message,
        should_store,
        managed_tools,
        next_message_position,
        ctx,
    ) = process_chat(session, chat_request, ctx)

    # Mark this message as part of a parallel group
    logger.info(
        f"Setting parallel attributes on response_message ID: {response_message.id}"
    )
    response_message.is_parallel = True
    response_message.parallel_group_id = parallel_group_id
    response_message.parallel_variant = 1

    # Create a wrapper around the stream generator to set parallel attributes on the second response
    async def parallel_stream_wrapper():
        async for event in CustomChat().chat(
            chat_request,
            stream=True,
            managed_tools=managed_tools,
            session=session,
            ctx=ctx,
        ):
            # Check if this is a STREAM_START event
            if event.get("event_type") == StreamEvent.STREAM_START:
                # This is the start of the second response
                logger.info(
                    f"Second response starting with generation_id: {event.get('generation_id')}"
                )

                # We need to create or update a message object for this response
                # Create a new response message for the second variant
                from uuid import uuid4

                second_response_message = message_crud.create_message(
                    session=session,
                    message=Message(
                        id=str(uuid4()),
                        text="",  # Will be filled during streaming
                        user_id=ctx.get_user_id(),
                        conversation_id=ctx.get_conversation_id(),
                        position=next_message_position
                        + 1,  # Position after the first response
                        agent=MessageAgent.CHATBOT,
                        is_active=True,
                        generation_id=event.get("generation_id"),
                        is_parallel=True,  # Mark as parallel
                        parallel_group_id=parallel_group_id,  # Same group ID
                        parallel_variant=2,  # Second variant
                    ),
                )
                logger.info(
                    f"Created second response message: {second_response_message.id} with parallel attributes"
                )

                # Store the ID in the context to reference later
                ctx.second_response_id = second_response_message.id

            yield event

    logger.info("Starting generate_chat_stream for parallel responses")
    return EventSourceResponse(
        generate_chat_stream(
            session,
            parallel_stream_wrapper(),
            response_message,
            should_store=should_store,
            next_message_position=next_message_position,
            ctx=ctx,
        ),
        media_type="text/event-stream",
        headers={
            "Connection": "keep-alive",
            "X-Stream-ID": stream_id,
        },
        send_timeout=300,
        ping=5,
    )
