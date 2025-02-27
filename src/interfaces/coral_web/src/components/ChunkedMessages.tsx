'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
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

const ChunkedMessages = forwardRef<HTMLDivElement, ChunkedMessagesProps>(
  function ChunkedMessagesInternal(props, ref) {
    const { agentId, onRetry } = props;
    const chunksContainerRef = useRef<HTMLDivElement>(null);
    
    // Get data from the chunkedMessages store
    const { chunkedMessages, showNextChunk } = usechunkedMessagesStore();
    
    // Extract data from chunkedMessages
    const stream1Chunks = chunkedMessages?.chunks?.stream1 || [];
    const stream2Chunks = chunkedMessages?.chunks?.stream2 || [];
    const currentIndex = chunkedMessages?.currentChunkIndex || 0;
    
    // Create the fallback text from chunks
    const stream1FallbackText = stream1Chunks.slice(0, currentIndex + 1).join('') || "No content available";
    const stream2FallbackText = stream2Chunks.slice(0, currentIndex + 1).join('') || "No content available";
    
    // Calculate progress
    const totalChunks = stream1Chunks.length || 0;
    const progress = totalChunks > 0 ? ((currentIndex + 1) / totalChunks) * 100 : 0;
    
    // State for tracking UI
    const [prevIndex, setPrevIndex] = useState(currentIndex);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredChunk, setHoveredChunk] = useState<number | null>(null);
    
    // Helper function to scroll to the bottom
    const scrollToBottom = () => {
      if (chunksContainerRef.current) {
        chunksContainerRef.current.scrollTop = chunksContainerRef.current.scrollHeight;
      }
    };
    
    // Handle click on chunk
    const handleChunkClick = (index: number) => {
      console.log(`Chunk ${index} clicked!`);
      alert(`You clicked chunk ${index + 1}`);
      // Add your custom click handling logic here
    };
    
    // Add global CSS styles
    useEffect(() => {
      if (typeof document !== 'undefined') {
        const existingStyle = document.getElementById('chunked-messages-style');
        if (!existingStyle) {
          const styleElement = document.createElement('style');
          styleElement.id = 'chunked-messages-style';
          styleElement.innerHTML = `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .chunk-animate-in {
              animation: fadeIn 0.4s ease-out forwards;
            }
            .chunk {
              display: inline;
              padding: 4px;
              margin: 0;
              border-radius: 3px;
              transition: background-color 0.2s ease;
              cursor: pointer;
              position: relative;
              font-size: inherit;
              font-family: inherit;
              line-height: inherit;
              font-weight: inherit;
            }
            .chunk.current {
              background-color: rgba(59, 130, 246, 0.15);
            }
            .chunk.even:not(.current) {
              background-color: rgba(200, 200, 200, 0.1);
            }
            .chunk.odd:not(.current) {
              background-color: rgba(230, 230, 230, 0.05);
            }
            .chunk:hover.current {
              background-color: rgba(59, 130, 246, 0.25);
            }
            .chunk:hover:not(.current) {
              background-color: rgba(200, 200, 200, 0.2);
            }
            /* Hide MessageRow text but keep layout */
            .hidden-message-content {
              visibility: hidden;
              position: relative;
              user-select: none;
            }
            .chunk-overlay {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 5;
              padding: 12px 12px 12px 48px;
              pointer-events: auto;
              box-sizing: border-box;
            }
          `;
          document.head.appendChild(styleElement);
          
          return () => {
            const element = document.getElementById('chunked-messages-style');
            if (element) document.head.removeChild(element);
          };
        }
      }
    }, []);
    
    // Scroll to bottom when chunks are initially loaded
    useEffect(() => {
      scrollToBottom();
    }, [stream1Chunks.length, stream2Chunks.length]);
    
    // Scroll to bottom when current index changes
    useEffect(() => {
      scrollToBottom();
      const delayedScroll = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(delayedScroll);
    }, [currentIndex]);
    
    // Animate and track when new chunks appear
    useEffect(() => {
      if (currentIndex > prevIndex) {
        setIsAnimating(true);
        setPrevIndex(currentIndex);
        
        scrollToBottom();
        const animationScroll = setTimeout(scrollToBottom, 50);
        
        const animationTimer = setTimeout(() => {
          setIsAnimating(false);
          scrollToBottom();
        }, 500);
        
        return () => {
          clearTimeout(animationTimer);
          clearTimeout(animationScroll);
        };
      }
    }, [currentIndex, prevIndex]);
    
    // If chunkedMessages is completely undefined, show welcome
    if (!chunkedMessages) {
      return (
        <div className="m-auto p-4">
          <Welcome show={true} agentId={agentId} />
        </div>
      );
    }
    
    // Render function for chunks
    const renderChunks = (chunks: any[], streamName: string) => {
      const elements = [];
      const maxIndex = Math.min(currentIndex, chunks.length - 1);
      
      for (let i = 0; i <= maxIndex; i++) {
        const chunkText = chunks[i] || '';
        const isCurrentChunk = i === maxIndex;
        const isEven = i % 2 === 0;
        const isHovered = hoveredChunk === i;
        
        const className = [
          'chunk',
          isEven ? 'even' : 'odd',
          isCurrentChunk ? 'current' : '',
          isCurrentChunk && isAnimating ? 'chunk-animate-in' : ''
        ].filter(Boolean).join(' ');
        
        elements.push(
          <span
            key={`${streamName}-chunk-${i}`}
            className={className}
            onClick={() => handleChunkClick(i)}
            onMouseEnter={() => setHoveredChunk(i)}
            onMouseLeave={() => setHoveredChunk(null)}
            data-chunk-index={i}
          >
            {chunkText}
          </span>
        );
      }
      
      return elements;
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
              
              {/* Simple container with overlay for chunks */}
              <div className="relative">
                {/* Hidden MessageRow */}
                <div className="hidden-message-content">
                  <MessageRow
                    isLast={false}
                    isStreamingToolEvents={false}
                    message={{
                      type: MessageType.BOT,
                      state: BotState.FULFILLED,
                      text: stream1FallbackText,
                    }}
                    onRetry={onRetry}
                  />
                </div>
                
                {/* Visible chunks overlay */}
                <div className="chunk-overlay">
                  <div className="prose prose-lg prose-mushroom">
                    {renderChunks(stream1Chunks, 'stream1')}
                  </div>
                </div>
              </div>
            </div>
    
            {/* Right column: Stream 2 */}
            <div className="flex flex-col">
              <div className="text-sm text-marble-400 font-medium pb-2">Response 2</div>
              
              {/* Simple container with overlay for chunks */}
              <div className="relative">
                {/* Hidden MessageRow */}
                <div className="hidden-message-content">
                  <MessageRow
                    isLast={false}
                    isStreamingToolEvents={false}
                    message={{
                      type: MessageType.BOT,
                      state: BotState.FULFILLED,
                      text: stream2FallbackText,
                    }}
                    onRetry={onRetry}
                  />
                </div>
                
                {/* Visible chunks overlay */}
                <div className="chunk-overlay">
                  <div className="prose prose-lg prose-mushroom">
                    {renderChunks(stream2Chunks, 'stream2')}
                  </div>
                </div>
              </div>
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
                onClick={showNextChunk}
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