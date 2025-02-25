import { Message, MessageAgent } from '@/cohere-client';
import { 
  BotState, 
  ChatMessage, 
  FulfilledMessage, 
  MessageType, 
  ParallelMessage,
  ParallelResponse,
  UserMessage 
} from '@/types/message';
import { replaceTextWithCitations } from '@/utils/citations';
import { replaceCodeBlockWithIframe } from '@/utils/preview';

interface ParallelApiMessage extends Message {
  is_parallel?: boolean;
  parallel_group_id?: string;
  parallel_variant?: number;
}

/**
 * A utility function that checks if the conversation title should be updated
 * Based on:
 *  - It has only two messages, one from the user and one from the bot.
 *  - If ~5 turns have passed, meaning every 5 messages from the bot.
 *    - Note: the bot can fail to respond and these turns can become out of sync but 5 bot messages
 *      implies that there were at least 5 matching user messages (user message === request, bot message === response pairs)
 * @param messages - The messages array
 * */
export const shouldUpdateConversationTitle = (messages: ChatMessage[]) => {
  const numUserMessages = messages.filter(
    (message) => message.type === MessageType.USER && !message.error
  ).length;
  const numBotMessages = messages.filter(
    (message) => message.type === MessageType.BOT && message.state === BotState.FULFILLED
  ).length;

  if (numUserMessages === 1 && numBotMessages === 1) {
    return true;
  }

  return numBotMessages % 5 === 0;
};

export type UserOrBotMessage = UserMessage | FulfilledMessage;

/**
 * @description Maps chat history given by the API to a list of messages that can be displayed in the chat.
 */
export const mapHistoryToMessages = (history?: Message[]): ChatMessage[] => {
  if (!history) return [];

  // Cast history to our extended type that includes parallel message properties
  const extendedHistory = history as ParallelApiMessage[];
  
  let result: ChatMessage[] = [];
  let tempToolEvents: FulfilledMessage['toolEvents'];
  
  // Process parallel messages first
  const parallelGroupsMap: Record<string, ParallelApiMessage[]> = {};
  
  // First pass: collect all parallel messages
  for (const message of extendedHistory) {
    if (message.is_parallel && message.parallel_group_id) {
      if (!parallelGroupsMap[message.parallel_group_id]) {
        parallelGroupsMap[message.parallel_group_id] = [];
      }
      parallelGroupsMap[message.parallel_group_id].push(message);
    }
  }
  
  // Second pass: process regular messages, skipping those in parallel groups
  for (const message of extendedHistory) {
    // Skip messages that are part of parallel groups
    if (message.is_parallel && message.parallel_group_id && 
        parallelGroupsMap[message.parallel_group_id].length >= 2) {
      continue;
    }
    
    if (message.agent === MessageAgent.CHATBOT) {
      if (!message.tool_plan) {
        result.push({
          type: MessageType.BOT,
          state: BotState.FULFILLED,
          originalText: message.text ?? '',
          text: replaceTextWithCitations(
            replaceCodeBlockWithIframe(message.text) ?? '',
            message.citations ?? [],
            message.generation_id ?? ''
          ),
          generationId: message.generation_id ?? '',
          citations: message.citations,
          toolEvents: tempToolEvents,
        });
        tempToolEvents = undefined;
      } else {
        // Historical tool events code (unchanged)
        if (tempToolEvents) {
          tempToolEvents.push({
            text: message.tool_plan,
            tool_calls: message.tool_calls,
          });
        } else {
          tempToolEvents = [{ text: message.tool_plan, tool_calls: message.tool_calls }];
        }
      }
    } else {
      result.push({
        type: MessageType.USER,
        text: replaceTextWithCitations(
          message.text ?? '',
          message.citations ?? [],
          message.generation_id ?? ''
        ),
        files: message.files,
      });
    }
  }
  
  // Third pass: create parallel message objects for complete groups
  Object.entries(parallelGroupsMap).forEach(([groupId, groupMsgs]) => {
    if (groupMsgs.length >= 2) {
      // Sort by variant number
      groupMsgs.sort((a, b) => 
        (a.parallel_variant || 0) - (b.parallel_variant || 0)
      );
      
      const parallelResponses: ParallelResponse[] = groupMsgs.map((msg, idx) => ({
        id: `response${idx+1}`,
        text: replaceTextWithCitations(
          replaceCodeBlockWithIframe(msg.text) ?? '',
          msg.citations ?? [],
          msg.generation_id ?? ''
        ),
        state: BotState.FULFILLED
      }));
      
      // Create a parallel message
      const parallelMessage: ParallelMessage = {
        type: MessageType.BOT,
        state: BotState.FULFILLED,
        isParallel: true,
        parallelResponses,
        text: ''
      };
      
      result.push(parallelMessage);
    }
  });
  
  return result;
};