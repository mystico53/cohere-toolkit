import React, { useState } from 'react';
import MessageRow from '@/components/MessageRow';
import { BotState, MessageType } from '@/types/message';
import { cn } from '@/utils';

type MessageStreamColumnProps = {
  streamId: 'stream1' | 'stream2';
  chunks: string[];
  currentIndex: number;
  onChunkClick: () => void;
  onFeedbackSelect: (feedback: 'positive' | 'negative') => void;
  onTextSelect: (selectedText: string) => void;
};

const MessageStreamColumn = ({
  streamId,
  chunks,
  currentIndex,
  onChunkClick,
  onFeedbackSelect,
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
      onTextSelect(text);
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
        
        {/* Inline feedback buttons */}
        <div className="absolute right-2 top-2 flex space-x-2 opacity-70 hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFeedbackSelect('positive');
            }}
            className="p-1 bg-green-500 rounded-full text-white"
            title="Positive feedback"
          >
            👍
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFeedbackSelect('negative');
            }}
            className="p-1 bg-red-500 rounded-full text-white"
            title="Negative feedback"
          >
            👎
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default MessageStreamColumn;