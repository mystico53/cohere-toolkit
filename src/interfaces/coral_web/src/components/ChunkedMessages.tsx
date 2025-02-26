'use client';

import { forwardRef } from 'react';
import MessageRow from '@/components/MessageRow';
import { Welcome } from '@/components/Welcome';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';

// Import the same Props type used in MessagingContainer
type ChunkedMessagesProps = {
  isStreaming: boolean;
  isStreamingToolEvents: boolean;
  isParallelStreaming: boolean;
  startOptionsEnabled: boolean;
  messages: any[];
  streamingMessage: any | null;
  streamingMessage1: any | null;
  streamingMessage2: any | null;
  agentId?: string;
  onRetry: VoidFunction;
  conversationId?: string;
};

/**
 * This component handles chunked message display.
 * It uses a two-column layout to show message chunks and content.
 */
const ChunkedMessages = forwardRef<HTMLDivElement, ChunkedMessagesProps>(
  function ChunkedMessagesInternal(props, ref) {
    const { agentId, onRetry } = props;

    // Hardcoded chunks for testing
    const hardcodedChunks = [
      {
        id: 'chunk-1',
        title: 'Introduction',
        content: 'This is the first chunk of the message. It introduces the concept.',
      },
      {
        id: 'chunk-2',
        title: 'Main Content',
        content: 'This is the second chunk which contains the main content of the message with detailed explanations.',
      },
      {
        id: 'chunk-3',
        title: 'Conclusion',
        content: 'This is the final chunk that wraps up the message with a conclusion.',
      },
    ];

    // Hardcoded full content for testing
    const fullContent = 'This is the full content that would combine all chunks together into a cohesive message. It would include the introduction, main content, and conclusion in a single view.';

    return (
      <div className="flex h-full flex-col gap-y-4 px-4 py-6 md:gap-y-6" ref={ref}>
        <div className="mt-auto flex flex-col gap-y-4 md:gap-y-6">
          {/* Chunk navigation header */}
          <div className="flex items-center justify-between border-b border-marble-950 pb-3">
            <div className="text-lg font-medium">Message Chunks</div>
            <div className="text-sm text-marble-400">
              Navigate through chunks to explore the content
            </div>
          </div>

          {/* Two-column layout for chunks */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left column: Chunks */}
            <div className="flex flex-col gap-4 border-r border-marble-950 pr-4">
              <div className="text-sm text-marble-400 font-medium pb-2">Message Chunks</div>
              
              {hardcodedChunks.map((chunk, index) => (
                <div 
                  key={chunk.id} 
                  className="border border-marble-900 rounded-md p-4 hover:bg-marble-950 cursor-pointer"
                >
                  <div className="font-medium mb-2">{chunk.title}</div>
                  <div className="text-sm text-marble-400">{chunk.content}</div>
                </div>
              ))}
            </div>

            {/* Right column: Full content */}
            <div className="flex flex-col">
              <div className="text-sm text-marble-400 font-medium pb-2">Full Context</div>
              
              <MessageRow
                isLast={true}
                isStreamingToolEvents={false}
                message={{
                  type: MessageType.BOT,
                  state: BotState.FULFILLED,
                  text: fullContent,
                }}
                onRetry={onRetry}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ChunkedMessages;