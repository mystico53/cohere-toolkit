'use client';

import { forwardRef, useEffect } from 'react';
import MessageRow from '@/components/MessageRow';
import { Welcome } from '@/components/Welcome';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type ChunkedMessagesProps = {
    agentId: string; 
    onRetry: () => void;
  };

const ChunkedMessages = forwardRef<HTMLDivElement, ChunkedMessagesProps>(
  function ChunkedMessagesInternal(props, ref) {
    const { agentId, onRetry } = props;
    
    // Get data from the chunkedMessages store
    const { chunkedMessages, showNextChunk, startFeedbackSession } = usechunkedMessagesStore();
    
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
    
    // Get current chunks with safe access
    const currentIndex = chunkedMessages.currentChunkIndex || 0;
    // Get all chunks up to and including the current index and join them
    const accumulatedChunk1 = chunkedMessages.chunks?.stream1
      ?.slice(0, currentIndex + 1)
      .join('') || '';
    const accumulatedChunk2 = chunkedMessages.chunks?.stream2
      ?.slice(0, currentIndex + 1)
      .join('') || '';
    
    // Calculate progress
    const totalChunks = chunkedMessages.chunks?.stream1?.length || 0;
    const progress = totalChunks > 0 ? ((currentIndex + 1) / totalChunks) * 100 : 0;

    return (
      <div className="flex h-full flex-col gap-y-4 px-4 py-6 md:gap-y-6" ref={ref}>
        <div className="mt-auto flex flex-col gap-y-4 md:gap-y-6">
          {/* Navigation header */}
          <div className="flex items-center justify-between border-b border-marble-950 pb-3">
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
          
          {/* Progress bar */}
          <div className="w-full bg-marble-900 h-1 rounded-full">
            <div 
              className="bg-blue-500 h-1 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Two-column layout for chunks */}
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
                  text: accumulatedChunk1,
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
                  text: accumulatedChunk2,
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