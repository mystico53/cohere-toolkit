from backend.tools.meeting_setup.tool import MeetingSetupTool

__all__ = ["MeetingSetupTool"]

# backend/tools/meeting_setup/constants.py
from typing import List

TOOL_ID = "meeting_setup"
TOOL_NAME = "Meeting Setup"
TOOL_DESCRIPTION = "Tool for setting up new meetings and scheduling"

MEETING_TRIGGERS: List[str] = [
    "setup a new meeting",
    "schedule a meeting",
    "set up a meeting",
]
