from typing import Any, Optional

from backend.schemas.context import Context
from backend.schemas.tool import ToolCategory, ToolDefinition
from backend.tools.base import BaseTool


class MeetingTool(BaseTool):
    """
    Simple tool that handles meeting setup questions.
    """

    ID = "toolkit_meeting"

    def __init__(self, **kwargs: Any):
        super().__init__(**kwargs)

    @classmethod
    def is_available(cls) -> bool:
        return True

    @classmethod
    def get_tool_definition(cls, **kwargs: Any) -> ToolDefinition:
        return ToolDefinition(
            name=cls.ID,
            display_name="Meeting Setup",
            implementation=cls,
            parameter_definitions={
                "trigger": {
                    "description": "The trigger phrase 'new meeting' that activates this tool",
                    "type": "str",
                    "required": True,
                }
            },
            is_visible=True,
            is_available=cls.is_available(),
            category=ToolCategory.Function,
            error_message=cls.generate_error_message(),
            description="A tool that helps set up meetings by asking relevant questions.",
            is_auth_required=False,
            auth_url=None,
            token=None,
            should_return_token=False,
            auth_implementation=None,
            **kwargs,
        )

    async def call(
        self, parameters: dict, ctx: Optional[Context] = None, **kwargs: Any
    ) -> list[dict[str, Any]]:
        """
        Main method that handles the tool's execution.
        Must return a list of dictionaries with at least a 'text' field.
        Optionally can include 'url' and 'title' fields.

        Args:
            parameters: Dictionary of parameters passed to the tool
            ctx: Optional context object
            **kwargs: Additional keyword arguments

        Returns:
            List of dictionaries containing at least a 'text' field
        """
        return [{"text": "Who do you want to meet?"}]
