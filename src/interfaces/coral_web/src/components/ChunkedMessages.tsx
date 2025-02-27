'use client';

import React, { forwardRef, useEffect, useRef } from 'react';
import MessageRow from '@/components/MessageRow';
import { Welcome } from '@/components/Welcome';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type ChunkedMessagesProps = {
  agentId: string; 
  onRetry: () => void;
};

// Interface for message chunk pairs
interface MessagePair {
  index: number;
  stream1: string;
  stream2: string;
}

const ChunkedMessages = forwardRef<HTMLDivElement, ChunkedMessagesProps>(
  function ChunkedMessagesInternal(props, ref) {
    const { agentId, onRetry } = props;
    const chunksContainerRef = useRef<HTMLDivElement>(null);
    
    // Get data from the chunkedMessages store
    const { chunkedMessages, showNextChunk, startFeedbackSession } = usechunkedMessagesStore();
    
    // Get current chunks index - moved this up before the useEffect that needs it
    const currentIndex = chunkedMessages?.currentChunkIndex || 0;
    
    // Debug logging
    useEffect(() => {
      console.log("[DEBUG] ChunkedMessages store data:", {
        isChunked: chunkedMessages?.isChunked,
        chunks1: chunkedMessages?.chunks?.stream1?.length,
        chunks2: chunkedMessages?.chunks?.stream2?.length
      });
      
      // Auto-start feedback session if not already started
      if (chunkedMessages && !chunkedMessages.isChunked && 
          chunkedMessages?.chunks?.stream1?.length > 0) {
        console.log("[DEBUG] Auto-starting feedback session");
        startFeedbackSession();
      }
    }, [chunkedMessages, startFeedbackSession]);
    
    // Auto-scroll to bottom when new chunks are added
    useEffect(() => {
      if (chunksContainerRef.current && currentIndex >= 0) {
        // Scroll to the bottom of the container when a new chunk is displayed
        chunksContainerRef.current.scrollTop = chunksContainerRef.current.scrollHeight;
      }
    }, [currentIndex]);
    
    // Modified check: only care if there are actual chunks
    const hasChunks = chunkedMessages?.chunks?.stream1?.length > 0 && 
                     chunkedMessages?.chunks?.stream2?.length > 0;
    
    // If no chunks or chunkedMessages is undefined, show welcome screen
    if (!chunkedMessages || !hasChunks) {
      return (
        <div className="m-auto p-4">
          <div className="p-4 mb-4 bg-blue-900 text-white rounded">
            <div className="font-bold">Debug Info:</div>
            <div>Chunked Messages State: {chunkedMessages ? "Available" : "Undefined"}</div>
            <div>Has Chunks: {hasChunks ? "Yes" : "No"}</div>
            {chunkedMessages && (
              <div>
                Stream1 Chunks: {chunkedMessages?.chunks?.stream1?.length || 0},
                Stream2 Chunks: {chunkedMessages?.chunks?.stream2?.length || 0}
              </div>
            )}
          </div>
          <Welcome show={true} agentId={agentId} />
        </div>
      );
    }
    
    // Calculate progress
    const totalChunks = chunkedMessages.chunks?.stream1?.length || 0;
    const progress = totalChunks > 0 ? ((currentIndex + 1) / totalChunks) * 100 : 0;

    // Generate accumulated chunks for display
    const messagePairs: MessagePair[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      const chunk1 = chunkedMessages.chunks?.stream1?.[i] || '';
      const chunk2 = chunkedMessages.chunks?.stream2?.[i] || '';
      
      messagePairs.push({
        index: i,
        stream1: chunk1,
        stream2: chunk2
      });
    }

    return (
      <div className="flex flex-col h-full relative" ref={ref}>
        {/* Main content area with flex-grow to take available space */}
        <div 
          ref={chunksContainerRef}
          className="flex-grow overflow-y-auto px-4 py-6 pb-20" // Added extra bottom padding
        >
          {/* Display chunks from oldest (top) to newest (bottom) */}
          {messagePairs.map((pair) => (
            <div key={`chunk-${pair.index}`} className="mb-6 last:mb-0">
              <div className="text-sm text-marble-400 font-medium mb-2">
                Chunk {pair.index + 1}
              </div>
              <div className="grid grid-cols-2 gap-6">
                {/* Left column: Stream 1 */}
                <div className="flex flex-col">
                  <div className="text-sm text-marble-400 font-medium pb-2">Response 1</div>
                  <MessageRow
                    isLast={false}
                    isStreamingToolEvents={false}
                    message={{
                      type: MessageType.BOT,
                      state: BotState.FULFILLED,
                      text: pair.stream1,
                    }}
                    onRetry={onRetry}
                  />
                </div>
        
                {/* Right column: Stream 2 */}
                <div className="flex flex-col">
                  <div className="text-sm text-marble-400 font-medium pb-2">Response 2</div>
                  <MessageRow
                    isLast={false}
                    isStreamingToolEvents={false}
                    message={{
                      type: MessageType.BOT,
                      state: BotState.FULFILLED,
                      text: pair.stream2,
                    }}
                    onRetry={onRetry}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Fixed control panel at bottom with absolute positioning */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-marble-950 bg-marble-1000 px-4 py-3 z-10 shadow-lg">
          {/* Progress bar */}
          <div className="w-full bg-marble-900 h-1 rounded-full mb-3">
            <div 
              className="bg-blue-500 h-1 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Navigation controls */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">Message Chunks</div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-marble-400">
                Chunk {currentIndex + 1} of {totalChunks}
              </div>
              <button 
                onClick={showNextChunk}
                disabled={currentIndex >= totalChunks - 1}
                className={cn(
                  "px-3 py-1 rounded-md text-sm",
                  currentIndex >= totalChunks - 1 
                    ? "bg-marble-800 text-marble-500 cursor-not-allowed" 
                    : "bg-marble-800 hover:bg-marble-700 text-white"
                )}
              >
                Next Chunk
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ChunkedMessages;