import { DEFAULT_CHAT_TEMPERATURE } from './constants';
import { CohereChatRequest } from './generated';

type ExtendedChatRequest = CohereChatRequest & {
  humanFeedback?: boolean;
};

export const mapToChatRequest = (request: ExtendedChatRequest): ExtendedChatRequest => {
  return {
    agent_id: request.agent_id,
    message: request.message,
    model: request.model,
    preamble: request.preamble,
    temperature: request.temperature ?? DEFAULT_CHAT_TEMPERATURE,
    conversation_id: request.conversation_id,
    documents: request.documents,
    tools: request.tools,
    file_ids: request.file_ids,
    humanFeedback: request.humanFeedback,
  };
};
