'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import MessageRow from '@/components/MessageRow';
import { Welcome } from '@/components/Welcome';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';
import { usechunkedMessagesStore } from '@/stores/persistedStore';
import StreamLoadingIndicator from './ChunkedMessagesStreamIndicator';

type ChunkedMessagesProps = {
  agentId: string; 
  onRetry: () => void;
};

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

.chunk-highlight {
  background-color: rgba(59, 130, 246, 0.05);
}

.chunk-animate-in {
  animation: fadeIn 0.4s ease-out forwards;
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
      scrollToBottom();
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
    
    // Always render even if there are no chunks yet
    const stream1Chunks = chunkedMessages?.chunks?.stream1 || [];
    const stream2Chunks = chunkedMessages?.chunks?.stream2 || [];
    
    // Show welcome only if chunkedMessages is completely undefined
    if (!chunkedMessages) {
      return (
        <div className="m-auto p-4">
          <Welcome show={true} agentId={agentId} />
        </div>
      );
    }
    
    // Calculate progress
    const totalChunks = stream1Chunks.length || 0;
    const progress = totalChunks > 0 ? ((currentIndex + 1) / totalChunks) * 100 : 0;

    // Combine all visible chunks for each stream into single strings
    // This is more reliable than trying to use React elements
    let stream1Text = '';
    let stream2Text = '';
    
    // Include all chunks up to the current index
    const maxIndex = Math.min(
      currentIndex, 
      stream1Chunks.length - 1, 
      stream2Chunks.length - 1
    );
    
    // Always show at least the first chunk if any exist
    const endIndex = Math.max(0, maxIndex);
    
    for (let i = 0; i <= endIndex; i++) {
      stream1Text += (stream1Chunks[i] || '');
      stream2Text += (stream2Chunks[i] || '');
    }

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
          <div className="grid grid-cols-2 gap-6">
            {/* Left column: Stream 1 */}
            <div className="flex flex-col">
              <div className="text-sm text-marble-400 font-medium pb-2">Response 1</div>
              {/* Single MessageRow for entire stream 1 */}
              <MessageRow
                isLast={false}
                isStreamingToolEvents={false}
                message={{
                  type: MessageType.BOT,
                  state: BotState.FULFILLED,
                  text: stream1Text,
                }}
                onRetry={onRetry}
              />
            </div>
    
            {/* Right column: Stream 2 */}
            <div className="flex flex-col">
              <div className="text-sm text-marble-400 font-medium pb-2">Response 2</div>
              {/* Single MessageRow for entire stream 2 */}
              <MessageRow
                isLast={false}
                isStreamingToolEvents={false}
                message={{
                  type: MessageType.BOT,
                  state: BotState.FULFILLED,
                  text: stream2Text,
                }}
                onRetry={onRetry}
              />
            </div>
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
            <div className="flex items-center gap-2">
              <div className="text-lg font-medium">Message Chunks</div>
              <StreamLoadingIndicator />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-marble-400">
                Chunk {currentIndex + 1} of {totalChunks || 1}
              </div>
              <button 
                onClick={handleNextChunk}
                disabled={totalChunks === 0 || currentIndex >= totalChunks - 1}
                className={cn(
                  "px-3 py-1 rounded-md text-sm",
                  totalChunks === 0 || currentIndex >= totalChunks - 1
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