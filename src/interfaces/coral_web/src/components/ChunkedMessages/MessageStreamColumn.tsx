import React, { useRef, useEffect, useState } from 'react';
import MessageRow from '@/components/MessageRow';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type MessageStreamColumnProps = {
  streamId: 'stream1' | 'stream2';
  chunks: string[];
  currentIndex: number;
  onFeedbackSelect: (rating: 'positive' | 'negative') => void;
  onTextSelect?: (text: string) => void
};

const MessageStreamColumn = ({
  streamId,
  chunks,
  currentIndex,
  onFeedbackSelect,
  onTextSelect
}: MessageStreamColumnProps) => {
  const { setSelectedText } = usechunkedMessagesStore();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [highlightHeight, setHighlightHeight] = useState(0);
  
  // Combine all visible chunks into a single string
  let visibleText = '';
  for (let i = 0; i <= currentIndex; i++) {
    if (chunks[i]) {
      visibleText += chunks[i];
    }
  }

  // Handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      if (onTextSelect) {
        onTextSelect(text);
      }
      setSelectedText(text, streamId, currentIndex);
    }
  };

  // Calculate the previous chunks' character count for approximate height estimation
  const prevChunksLength = chunks
    .slice(0, currentIndex)
    .reduce((acc, chunk) => acc + chunk.length, 0);
  
  const totalCharsCount = visibleText.length;
  
  // After the component renders, calculate the height for the highlight overlay
  useEffect(() => {
    if (messageContainerRef.current && prevChunksLength > 0) {
      const containerHeight = messageContainerRef.current.scrollHeight;
      const ratio = prevChunksLength / totalCharsCount;
      // Estimate the height of previous chunks based on their proportion of total text
      setHighlightHeight(containerHeight * ratio);
    }
  }, [prevChunksLength, totalCharsCount, visibleText]);

  return (
    <div className="flex flex-col">
      <div className="text-sm text-marble-400 font-medium pb-2">
        Response {streamId === 'stream1' ? '1' : '2'} (Chunk {currentIndex + 1} of {chunks.length || 1})
      </div>
      
      <div 
        className="clickable-message relative"
        onMouseUp={handleMouseUp}
        ref={messageContainerRef}
      >
        <MessageRow
          isLast={false}
          isStreamingToolEvents={false}
          message={{
            type: MessageType.BOT,
            state: BotState.FULFILLED,
            text: visibleText,
          }}
          onRetry={() => {}}
        />
        
        {/* Highlight overlay for previous chunks */}
        {prevChunksLength > 0 && (
          <div 
            className="absolute top-0 left-0 w-full pointer-events-none"
            style={{
              height: `${highlightHeight}px`,
              backgroundColor: 'rgba(255, 0, 0, 0.15)',
              backdropFilter: 'brightness(90%)'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MessageStreamColumn;