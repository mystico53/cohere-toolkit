import React, { useRef } from 'react';
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
  
  // Combine all visible chunks into a single string
  let visibleText = '';
  
  // Add all chunks up to and including the current one
  for (let i = 0; i <= currentIndex; i++) {
    if (chunks[i]) {
      // Only add zone label for the current chunk
      if (i === currentIndex) {
        visibleText += `\nEvaluation Section ${i + 1} of ${chunks.length}\n\n${chunks[i]}\n`;
      } else {
        // Previous chunks don't get any decoration
        visibleText += `${chunks[i]}\n\n`;
      }
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

  return (
    <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'flex-end' }}>
      <div className="text-sm text-marble-400 font-medium pb-2">
        Response {streamId === 'stream1' ? '1' : '2'} 
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
      </div>
    </div>
  );
};

export default MessageStreamColumn;