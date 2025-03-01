import React, { useState, useEffect, useRef } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type FeedbackPanelProps = {
  streamId: 'stream1' | 'stream2';
};

const FeedbackPanel = ({ streamId }: FeedbackPanelProps) => {
  // Add ref for panel
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Local state for the comment input
  const [comment, setComment] = useState('');
  
  // Access the store safely with defensive checks
  const store = usechunkedMessagesStore();
  
  // Calculate position based on streamId
  const position = streamId === 'stream1' 
    ? 'left-0 right-1/2 pr-3' // Left half 
    : 'left-1/2 right-0 pl-3'; // Right half
  
  // Safely get the current chunk index with a fallback to 0
  const currentChunkIndex = store.chunkedMessages?.currentChunkIndices?.[streamId] ?? 0;
  
  // Get the total number of chunks for this stream
  const totalChunks = store.chunkedMessages?.chunks?.[streamId]?.length ?? 0;
  
  // Add text selection handling
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || !selection.toString().trim()) {
        // Clear the selection if store has clearSelectedText method
        if (store.clearSelectedText) {
          store.clearSelectedText();
        }
        return;
      }
      
      // Get the selection text
      const text = selection.toString().trim();
      
      // Determine if the selection is in this stream's half of the screen
      const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      const middleOfScreen = window.innerWidth / 2;
      
      const isInThisStream = 
        (streamId === 'stream1' && selectionRect.left < middleOfScreen) ||
        (streamId === 'stream2' && selectionRect.right >= middleOfScreen);
      
      if (isInThisStream && store.setSelectedText) {
        store.setSelectedText(text, streamId, currentChunkIndex);
      }
    };
    
    // Add click handler to clear selection when clicking outside text
    const handleDocumentClick = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || !selection.toString().trim()) {
        if (store.clearSelectedText) {
          store.clearSelectedText();
        }
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [streamId, currentChunkIndex, store]);
  
  // Get the currently selected text from the store
  const selectedText = store.chunkedMessages?.selectedText || '';
  const activeFeedback = store.chunkedMessages?.activeFeedback || { streamId: null, chunkIndex: null };
  
  // Only show selected text if it belongs to this panel's stream
  const isSelectedTextForThisStream = activeFeedback?.streamId === streamId;
  const displaySelectedText = isSelectedTextForThisStream ? selectedText : '';
  
  // Safely get current feedback for this chunk (if any)
  const getFeedbackSafely = () => {
    if (!store.chunkedMessages?.feedback?.[streamId]) return undefined;
    return store.chunkedMessages.feedback[streamId][currentChunkIndex];
  };
  
  const currentFeedback = getFeedbackSafely();
  
  // Initialize comment field with existing comment when chunk changes
  useEffect(() => {
    setComment(currentFeedback?.comment || '');
  }, [currentChunkIndex, streamId, currentFeedback?.comment]);
  
  // Prepare feedback object with the currently selected text
  const prepareFeedbackWithSelection = (rating: 'positive' | 'negative' | undefined) => {
    return {
      rating,
      comment: comment.trim(),
      selectedText: isSelectedTextForThisStream ? selectedText : currentFeedback?.selectedText || '',
      timestamp: Date.now()
    };
  };
  
  // Handle "I prefer this section" click (replaces thumbs up)
  const handlePreferSection = () => {
    if (store.recordFeedback) {
      const feedback = prepareFeedbackWithSelection('positive');
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Clear the selected text after saving
      if (store.clearSelectedText) {
        store.clearSelectedText();
      }
      
      // Add this line to advance both streams after feedback
      if (store.showNextChunk) {
        store.showNextChunk();
      }
    }
  };
  
  // We've removed the thumbs down functionality
  
  // Handle comment changes with auto-save functionality (mockup)
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
    
    // In a real implementation, we would debounce this autosave
    // For the mockup, we're just updating the state
    // No actual store integration as per requirements
  };

  return (
    <>
      {/* Floating selected text indicator - positioned outside the panel */}
      {displaySelectedText && (
        <div className="fixed bottom-[120px] left-1/2 transform -translate-x-1/2 z-20 bg-marble-800 border border-marble-700 rounded-md px-3 py-2 shadow-lg max-w-sm">
          <div className="text-xs text-marble-300 whitespace-nowrap overflow-hidden text-ellipsis">
            Selected: "{displaySelectedText}"
          </div>
        </div>
      )}
      
      {/* Main feedback panel - fixed at bottom */}
      <div 
        ref={panelRef}
        className={`fixed bottom-[60px] ${position} border-t border-marble-950 bg-marble-1000 px-4 py-3 z-10`}
      >
        <div className="text-sm font-medium text-marble-400 text-center">
          <span>Feedback for Section {currentChunkIndex + 1} of {totalChunks}</span>
        </div>
        
        {/* "I prefer this section" button and comment input on the same line */}
        <div className="mt-3 flex items-center justify-center space-x-3">
          <button
            onClick={handlePreferSection}
            className={`px-4 py-2 text-sm rounded ${
              currentFeedback?.rating === 'positive' || currentChunkIndex >= totalChunks - 1
                ? 'bg-green-700 text-white'
                : 'bg-marble-800 hover:bg-marble-700 text-marble-300'
            }`}
          >
            {currentChunkIndex >= totalChunks - 1
              ? "Thank you for your feedback"
              : "I prefer this section"
            }
          </button>
          
          {/* Only show comment field if not at the last section */}
          {currentChunkIndex < totalChunks - 1 && (
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 text-sm bg-marble-900 border border-marble-800 rounded"
              />
              {/* Green checkmark that appears when comment is not empty */}
              {comment.trim() !== '' && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedbackPanel;