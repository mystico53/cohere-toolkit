import React from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';
import MessageRow from '@/components/MessageRow';
import { Button } from '@/components/Shared/Button';
import { MessageType, BotState } from '@/types/message';
import { ChatMessage, StreamingMessage } from '@/types/chat';

// Component props - mirroring what ParallelMessages expects
interface chunkedMessagesMessagesProps {
  messages: ChatMessage[];
  streamingMessage1: StreamingMessage | null;
  streamingMessage2: StreamingMessage | null;
  isParallelStreaming: boolean;
  isStreamingToolEvents: boolean;
  agentId?: string;
  onRetry: VoidFunction;
}

export const chunkedMessagesMessages: React.FC<chunkedMessagesMessagesProps> = ({
}) => {
  // Debug the store access
  const storeState = usechunkedMessagesStore();
  console.log('chunkedMessages store state:', storeState);
  
  // Safely access store values with fallbacks
  const chunkedMessages = storeState?.chunkedMessages;
  const recordFeedback = storeState?.recordFeedback || (() => console.warn('recordFeedback not available'));
  const showNextChunk = storeState?.showNextChunk || (() => console.warn('showNextChunk not available'));
  
  // Early return if store data isn't available yet
  if (!chunkedMessages || !chunkedMessages.chunks) {
    console.warn('chunkedMessages data not yet available');
    return (
      <div className="flex h-full items-center justify-center">
        <p>Preparing feedback testing interface...</p>
      </div>
    );
  }
  
  // Now safe to destructure
  const { 
    currentChunkIndex, 
    chunks, 
    responses,
    isComplete 
  } = chunkedMessages;

  // Calculate what content to show based on current chunk index
  const getVisibleContent = (streamChunks: string[]) => {
    // Only show chunks up to the current index
    return streamChunks
      .slice(0, currentChunkIndex + 1)  // +1 because slice end is exclusive
      .join('');  // Combine chunks into a single string
  };

  // Get visible content for both streams
  const visibleContent1 = getVisibleContent(chunks.stream1);
  const visibleContent2 = getVisibleContent(chunks.stream2);

  // Create message objects to pass to MessageRow
  const createDisplayMessage = (text: string) => ({
    type: MessageType.BOT,  // Enum value for bot messages
    text: text,
    state: BotState.FULFILLED,  // Show as completed message
    // Other required properties...
  });

  const displayMessage1 = createDisplayMessage(visibleContent1);
  const displayMessage2 = createDisplayMessage(visibleContent2);

  // Handle feedback submission
  const handleFeedback = (
    streamId: 'stream1' | 'stream2', 
    rating: 'positive' | 'negative'
  ) => {
    // 1. Record the feedback for current chunk
    recordFeedback(streamId, { rating });
    
    // 2. Advance to next chunk (if not already at the end)
    if (currentChunkIndex < chunks.stream1.length - 1) {
      showNextChunk();
    }
  };

  // Check if we're on the last chunk
  const isLastChunk = currentChunkIndex === chunks.stream1.length - 1;

  return (
    <div className="flex h-full flex-col px-4 py-6">
      {/* Progress indicator */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
            style={{ 
              width: `${((currentChunkIndex + 1) / chunks.stream1.length) * 100}%` 
            }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Chunk {currentChunkIndex + 1} of {chunks.stream1.length}
        </div>
      </div>

      {/* Instruction for testers */}
      <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
        Please review this portion of the responses and provide feedback.
      </div>
      
      {/* Parallel responses grid */}
      <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
        {/* Left column - Stream 1 */}
        <div className="flex flex-col">
          <div className="text-sm text-gray-500 mb-2">Response 1</div>
          <div className="border rounded p-4 mb-4">
            <MessageRow
              message={displayMessage1}
              isLast={true}
              isStreamingToolEvents={false}
              onRetry={() => {}}
            />
          </div>
          
          {/* Feedback buttons for Stream 1 */}
          <div className="flex mt-2 space-x-2">
            <Button 
              onClick={() => handleFeedback('stream1', 'positive')}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded"
            >
              👍 Good
            </Button>
            <Button 
              onClick={() => handleFeedback('stream1', 'negative')}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded"
            >
              👎 Poor
            </Button>
          </div>
        </div>
        
        {/* Right column - Stream 2 */}
        <div className="flex flex-col">
          <div className="text-sm text-gray-500 mb-2">Response 2</div>
          <div className="border rounded p-4 mb-4">
            <MessageRow
              message={displayMessage2}
              isLast={true}
              isStreamingToolEvents={false}
              onRetry={() => {}}
            />
          </div>
          
          {/* Feedback buttons for Stream 2 */}
          <div className="flex mt-2 space-x-2">
            <Button 
              onClick={() => handleFeedback('stream2', 'positive')}
              className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded"
            >
              👍 Good
            </Button>
            <Button 
              onClick={() => handleFeedback('stream2', 'negative')}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded"
            >
              👎 Poor
            </Button>
          </div>
        </div>
      </div>
      
      {/* "Next" button that appears after both responses have feedback */}
      {isLastChunk && (
        <div className="mt-8 text-center">
          <Button 
            onClick={() => {/* Handle completion logic */}}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Complete Feedback
          </Button>
        </div>
      )}
    </div>
  );
};