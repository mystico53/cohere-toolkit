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

type ProcessedMessages = {
  userMessages: ChatMessage[];
  parallelGroups: {
    userMessageIndex: number;
    messages: [ChatMessage, ChatMessage];
  }[];
  regularMessages: ChatMessage[];
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

  // Process messages to identify parallel groups
  const processedMessages = useMemo(() => {
    const processed: ProcessedMessages = {
      userMessages: [],
      parallelGroups: [],
      regularMessages: []
    };
    
    // First pass: collect all user messages and identify potential parallel groups
    let tempParallelGroupMap: Record<string, ChatMessage[]> = {};
    
    messages.forEach((message, index) => {
      if (message.type === MessageType.USER) {
        processed.userMessages.push(message);
        processed.regularMessages.push(message);
      } else if (message.isParallel && message.parallelGroup) {
        // Collect parallel messages by their group ID
        if (!tempParallelGroupMap[message.parallelGroup]) {
          tempParallelGroupMap[message.parallelGroup] = [];
        }
        tempParallelGroupMap[message.parallelGroup].push(message);
      } else {
        // Regular bot message
        processed.regularMessages.push(message);
      }
    });
    
    // Second pass: organize parallel messages into pairs
    Object.entries(tempParallelGroupMap).forEach(([groupId, groupMessages]) => {
      if (groupMessages.length === 2) {
        // Find the user message this group responds to
        // Assumption: The user message appears before the parallel messages
        const userMessageIndex = processed.userMessages.length - 1;
        
        // Sort by parallelPosition (0 = first, 1 = second)
        const sortedMessages = [...groupMessages].sort((a, b) => 
          (a.parallelPosition || 0) - (b.parallelPosition || 0)
        );
        
        if (sortedMessages.length === 2) {
          processed.parallelGroups.push({
            userMessageIndex,
            messages: [sortedMessages[0], sortedMessages[1]] as [ChatMessage, ChatMessage]
          });
          
          // Remove these messages from regularMessages if they were added
          processed.regularMessages = processed.regularMessages.filter(
            msg => !groupMessages.includes(msg)
          );
        }
      }
    });
    

    
    return processed;
  }, [messages]);

  // Show parallel streams only when we have streaming content
  const showParallelStreaming = isParallelStreaming && (streamingMessage1 || streamingMessage2);

  return (
    <div className="flex h-full flex-col px-4 py-6" ref={ref}>
      {/* Regular message history */}
      <div className="mt-auto flex flex-col gap-y-4 md:gap-y-6">
        {processedMessages.regularMessages.map((message, index) => {
          const isLastInList = index === processedMessages.regularMessages.length - 1;
          return (
            <MessageRow
              key={`reg-${index}`}
              message={message}
              isLast={isLastInList && !isParallelStreaming}
              isStreamingToolEvents={isStreamingToolEvents}
              onRetry={onRetry}
            />
          );
        })}
        
        {/* Saved Parallel Message Groups */}
        {processedMessages.parallelGroups.map((group, groupIndex) => (
          <div 
            key={`group-${groupIndex}`} 
            className="grid grid-cols-2 gap-4 border-t border-marble-950 pt-4 mt-4"
          >
            <div className="flex flex-col">
              <div className="text-sm text-marble-400 mb-2">Response 1</div>
              <MessageRow
                isLast={false}
                isStreamingToolEvents={false}
                message={group.messages[0]}
                onRetry={onRetry}
              />
            </div>
            <div className="flex flex-col">
              <div className="text-sm text-marble-400 mb-2">Response 2</div>
              <MessageRow
                isLast={false}
                isStreamingToolEvents={false}
                message={group.messages[1]}
                onRetry={onRetry}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Currently Streaming Parallel Messages */}
      {showParallelStreaming && (
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