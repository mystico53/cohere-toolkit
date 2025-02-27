'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
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

// Add this style to your global CSS or load it dynamically
const globalStyle = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-15px);
  }
}

.chunk-animate-in {
  animation: fadeIn 0.4s ease-out forwards;
}

.chunk-animate-up {
  animation: slideUp 0.4s ease-out forwards;
}
`;

const ChunkedMessages = forwardRef<HTMLDivElement, ChunkedMessagesProps>(
  function ChunkedMessagesInternal(props, ref) {
    const { agentId, onRetry } = props;
    const chunksContainerRef = useRef<HTMLDivElement>(null);
    
    // Get data from the chunkedMessages store
    const { chunkedMessages, showNextChunk, startFeedbackSession } = usechunkedMessagesStore();
    
    // Track current and previous index to detect changes
    const currentIndex = chunkedMessages?.currentChunkIndex || 0;
    const [prevIndex, setPrevIndex] = useState(currentIndex);
    const [isAnimating, setIsAnimating] = useState(false);
    
    // Helper function to scroll to the bottom
    const scrollToBottom = () => {
      if (chunksContainerRef.current) {
        chunksContainerRef.current.scrollTop = chunksContainerRef.current.scrollHeight;
      }
    };
    
    // Add styles to document on mount
    useEffect(() => {
      if (typeof document !== 'undefined') {
        // Check if the style already exists to avoid duplicates
        const existingStyle = document.getElementById('chunked-messages-animation-style');
        if (!existingStyle) {
          const styleElement = document.createElement('style');
          styleElement.id = 'chunked-messages-animation-style';
          styleElement.innerHTML = globalStyle;
          document.head.appendChild(styleElement);
          
          // Clean up on unmount
          return () => {
            const element = document.getElementById('chunked-messages-animation-style');
            if (element) document.head.removeChild(element);
          };
        }
      }
    }, []);
    
    // Scroll to bottom when chunks are initially loaded
    useEffect(() => {
      if (hasChunks) {
        scrollToBottom();
      }
    }, [chunkedMessages?.chunks?.stream1?.length, chunkedMessages?.chunks?.stream2?.length]);
    
    // Scroll to bottom when current index changes
    useEffect(() => {
      scrollToBottom();
      
      // Also scroll after a small delay to handle any DOM updates
      const delayedScroll = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(delayedScroll);
    }, [currentIndex]);
    
    // Debug logging
    useEffect(() => {
      console.log("[DEBUG] ChunkedMessages store data:", {
        isChunked: chunkedMessages?.isChunked,
        chunks1: chunkedMessages?.chunks?.stream1?.length,
        chunks2: chunkedMessages?.chunks?.stream2?.length,
        currentIndex
      });
      
      // Auto-start feedback session if not already started
      if (chunkedMessages && !chunkedMessages.isChunked && 
          chunkedMessages?.chunks?.stream1?.length > 0) {
        console.log("[DEBUG] Auto-starting feedback session");
        startFeedbackSession();
      }
    }, [chunkedMessages, startFeedbackSession, currentIndex]);
    
    // Animate and track when new chunks appear
    useEffect(() => {
      if (currentIndex > prevIndex) {
        // A new chunk was added
        setIsAnimating(true);
        setPrevIndex(currentIndex);
        
        // Scroll to bottom immediately and after animation starts
        scrollToBottom();
        const animationScroll = setTimeout(scrollToBottom, 50);
        
        // Clear animation state after animation completes
        const animationTimer = setTimeout(() => {
          setIsAnimating(false);
          scrollToBottom(); // Scroll once more after animation completes
        }, 500); // Match this to animation duration
        
        return () => {
          clearTimeout(animationTimer);
          clearTimeout(animationScroll);
        };
      }
    }, [currentIndex, prevIndex]);
    
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

    // Generate message pairs in chronological order
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
    
    // Determine the index of the latest chunk
    const lastChunkIndex = messagePairs.length - 1;

    // Custom event handler for Next Chunk that also scrolls
    const handleNextChunk = () => {
      showNextChunk();
      // Scroll will happen via the useEffect that watches currentIndex
    };

    return (
      <div className="flex flex-col h-full relative overflow-hidden" ref={ref}>
        {/* Content area with explicit height to enable scrolling */}
        <div 
          ref={chunksContainerRef}
          className="flex-grow flex flex-col overflow-y-auto w-full px-4 py-6 pb-20"
          style={{ height: 'calc(100% - 60px)', scrollBehavior: 'smooth' }}
        >
          <div className="flex flex-col space-y-6">
            {/* Messages in order */}
            {messagePairs.map((pair, arrayIndex) => (
              <div 
                key={`chunk-${pair.index}`} 
                className={cn(
                  "mb-6 last:mb-0",
                  {
                    "chunk-animate-in": arrayIndex === lastChunkIndex && isAnimating,
                    "chunk-animate-up": arrayIndex !== lastChunkIndex && isAnimating
                  }
                )}
              >
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
        </div>
        
        {/* Fixed control panel at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[60px] border-t border-marble-950 bg-marble-1000 px-4 py-3 z-10 shadow-lg">
          {/* Progress bar with smooth transition */}
          <div className="w-full bg-marble-900 h-1 rounded-full mb-3">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out" 
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
                onClick={handleNextChunk}
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