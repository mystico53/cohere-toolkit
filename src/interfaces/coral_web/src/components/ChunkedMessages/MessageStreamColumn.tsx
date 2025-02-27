import React, { useState } from 'react';
import MessageRow from '@/components/MessageRow';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';

type MessageStreamColumnProps = {
  streamId: 'stream1' | 'stream2';
  chunks: string[];
  currentIndex: number;
  onChunkClick: () => void;
  onFeedbackSelect: (rating: 'positive' | 'negative') => void;
  onTextSelect?: (text: string) => void
};

const MessageStreamColumn = ({
  streamId,
  chunks,
  currentIndex,
  onChunkClick,
  onTextSelect
}: MessageStreamColumnProps) => {
  const [selectedText, setSelectedText] = useState('');
  
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
      setSelectedText(text);
      if (onTextSelect) {
        onTextSelect(text);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className="text-sm text-marble-400 font-medium pb-2">
        Response {streamId === 'stream1' ? '1' : '2'} (Chunk {currentIndex + 1} of {chunks.length || 1})
      </div>
      
      {/* Message content */}
      <div 
        className={cn(
          "clickable-message relative",
          currentIndex < chunks.length - 1 ? "cursor-pointer" : "cursor-default"
        )}
        onClick={onChunkClick}
        onMouseUp={handleMouseUp}
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
      
      </div>
      
    </div>
  );
};

export default MessageStreamColumn;