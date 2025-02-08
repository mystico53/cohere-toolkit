from typing import Any

from backend.schemas.context import Context
from backend.schemas.tool import ToolCategory, ToolDefinition
from backend.tools.base import BaseTool

from .constants import (
    TOOL_DESCRIPTION,
    TOOL_ID,
    TOOL_NAME,
)


class MeetingSetupTool(BaseTool):
    """Tool for setting up new meetings"""

    ID = TOOL_ID

    @classmethod
    def is_available(cls) -> bool:
        return True

    @classmethod
    def get_tool_definition(cls) -> ToolDefinition:
        return ToolDefinition(
            name=cls.ID,
            display_name=TOOL_NAME,
            implementation=MeetingSetupTool,
            parameter_definitions={
                "message": {
                    "description": "The meeting setup request message",
                    "type": "str",
                    "required": True,
                }
            },
            is_visible=True,
            is_available=cls.is_available(),
            category=ToolCategory.Function,
            error_message=cls.generate_error_message(),
            description=TOOL_DESCRIPTION,
        )  # type: ignore

    async def call(
        self, parameters: dict, ctx: Context, **kwargs: Any
    ) -> list[dict[str, Any]]:
        """
        Execute the meeting setup tool

        Args:
            parameters: Tool parameters including the message
            ctx: Context object for logging and tracking
            **kwargs: Additional keyword arguments

        Returns:
            List of response dictionaries
        """
        logger = ctx.get_logger()

        try:
            return [
                {
                    "status": "success",
                    "type": "meeting_setup",
                    "action": "query_details",
                    "message": "Who are you meeting and in which company do they work?",
                }
            ]
        except Exception as e:
            logger.error(event=f"[MeetingSetup] Error processing request: {e}")
            return self.get_tool_error(details=str(e))
