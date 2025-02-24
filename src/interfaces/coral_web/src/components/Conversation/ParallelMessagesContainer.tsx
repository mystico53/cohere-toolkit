import React, { forwardRef } from 'react';
import { ChatMessage, StreamingMessage, MessageType, isFulfilledMessage } from '@/types/message';
import { Welcome } from '@/components/Welcome';
import MessageRow from '@/components/MessageRow';
import { cn } from '@/utils';

type ParallelMessagesProps = {
  messages: ChatMessage[];
  streamingMessage1: StreamingMessage | null;
  streamingMessage2: StreamingMessage | null;
  isParallelStreaming: boolean;
  isStreamingToolEvents: boolean;
  agentId?: string;
  onRetry: VoidFunction;
};

const ParallelMessages = forwardRef<HTMLDivElement, ParallelMessagesProps>(function MessagesInternal(
  { 
    messages, 
    streamingMessage1, 
    streamingMessage2, 
    isParallelStreaming,
    isStreamingToolEvents,
    agentId, 
    onRetry 
  }, 
  ref
) {
  const isChatEmpty = messages.length === 0;

  if (isChatEmpty) {
    return (
      <div className="m-auto p-4">
        <Welcome show={isChatEmpty} agentId={agentId} />
      </div>
    );
  }

  // Show parallel streams only when we have streaming content
  const showParallel = isParallelStreaming && (streamingMessage1 || streamingMessage2);

  console.log('Parallel Display Debug:', {
    isParallelStreaming,
    hasMessage1: !!streamingMessage1,
    hasMessage2: !!streamingMessage2,
    streamingMessage1,
    streamingMessage2
  });

  return (
    <div className="flex h-full flex-col px-4 py-6" ref={ref}>
      {/* Regular message history */}
      <div className="mt-auto flex flex-col gap-y-4 md:gap-y-6">
        {messages.map((m, i) => {
          const isLastInList = i === messages.length - 1;
          return (
            <MessageRow
              key={i}
              message={m}
              isLast={isLastInList && !isParallelStreaming}
              isStreamingToolEvents={isStreamingToolEvents}
              onRetry={onRetry}
            />
          );
        })}
      </div>

      {/* Parallel Streaming Messages */}
      {showParallel && (
        <div className="grid grid-cols-2 gap-4 border-t border-marble-950 pt-4 mt-4">
          <div className="flex flex-col">
            <div className="text-sm text-marble-400 mb-2">Response 1</div>
            {streamingMessage1 && (
              <MessageRow
                isLast={true}
                isStreamingToolEvents={isStreamingToolEvents}
                message={streamingMessage1}
                onRetry={onRetry}
              />
            )}
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-marble-400 mb-2">Response 2</div>
            {streamingMessage2 && (
              <MessageRow
                isLast={true}
                isStreamingToolEvents={isStreamingToolEvents}
                message={streamingMessage2}
                onRetry={onRetry}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});



export default ParallelMessages;