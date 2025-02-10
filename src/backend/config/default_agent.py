import datetime

from backend.config.tools import Tool
from backend.model_deployments.cohere_platform import CohereDeployment
from backend.schemas.agent import AgentPublic
from community.config.tools import CommunityTool

DEFAULT_AGENT_ID = "default"
DEFAULT_DEPLOYMENT = CohereDeployment.name()
DEFAULT_MODEL = "command-r-plus"


def get_default_agent() -> AgentPublic:
    return AgentPublic(
        id=DEFAULT_AGENT_ID,
        name="Command R+",
        description="Ask questions and get answers based on your tools and files.",
        created_at=datetime.datetime.now(),
        updated_at=datetime.datetime.now(),
        preamble="",
        version=1,
        temperature=0.3,
        tools=[
            Tool.Read_File.value.ID,
            Tool.Search_File.value.ID,
            Tool.Python_Interpreter.value.ID,
            Tool.Hybrid_Web_Search.value.ID,
            Tool.Calculator.value.ID,
            Tool.Wiki_Retriever_LangChain.value.ID,
            CommunityTool.Meeting.value.ID,  # This will resolve to "toolkit_meeting"
        ],
        tools_metadata=[],
        deployment=DEFAULT_DEPLOYMENT,
        model=DEFAULT_MODEL,
        user_id="",
        organization_id=None,
        is_private=False,
    )
