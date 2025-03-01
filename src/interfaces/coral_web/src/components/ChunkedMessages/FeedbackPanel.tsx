import React, { useState, useEffect, useRef } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type FeedbackPanelProps = {
  streamId: 'stream1' | 'stream2';
};

const FeedbackPanel = ({ streamId }: FeedbackPanelProps) => {
  // Add ref for panel
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Local state for the comment input and selected text
  const [comment, setComment] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  
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
  
  // Get the currently selected text from the store
  const selectedText = store.chunkedMessages?.selectedText || '';
  const activeFeedback = store.chunkedMessages?.activeFeedback || { streamId: null, chunkIndex: null };
  
  // Only show selected text if it belongs to this panel's stream
  const isSelectedTextForThisStream = activeFeedback?.streamId === streamId;
  
  // Track when text is selected in this stream and store it
  useEffect(() => {
    if (isSelectedTextForThisStream && selectedText) {
      setHighlightedText(selectedText);
    }
  }, [isSelectedTextForThisStream, selectedText]);
  
  // Safely get current feedback for this chunk (if any)
  const getFeedbackSafely = () => {
    if (!store.chunkedMessages?.feedback?.[streamId]) return undefined;
    return store.chunkedMessages.feedback[streamId][currentChunkIndex];
  };
  
  const currentFeedback = getFeedbackSafely();
  
  // Add text selection handling
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || !selection.toString().trim()) {
        // Don't clear the highlighted text here, it should persist
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
        // Update our local state with the highlighted text
        setHighlightedText(text);
      }
    };
    
    // Add click handler to clear selection when clicking outside text
    const handleDocumentClick = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || !selection.toString().trim()) {
        // Only clear the store's selection state, not our local highlight
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
  
  // Clear the highlighted text when moving to the next chunk
  useEffect(() => {
    setHighlightedText('');
  }, [currentChunkIndex]);
  
  // Initialize comment field with existing comment when chunk changes
  useEffect(() => {
    if (currentFeedback?.comment) {
      setComment(currentFeedback.comment);
    } else {
      setComment('');
    }
  }, [currentChunkIndex, streamId, currentFeedback]);
  
  // Prepare feedback object with the currently selected text
  const prepareFeedbackWithSelection = (rating: 'positive' | 'negative' | undefined) => {
    return {
      rating,
      comment: comment.trim(),
      selectedText: isSelectedTextForThisStream ? selectedText : highlightedText,
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
  
  // Handle comment changes with auto-save functionality (mockup)
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
  };

  // Calculate position for the highlight box based on streamId
  const highlightPosition = streamId === 'stream1' 
    ? 'left-[25%] -translate-x-1/2' // Centered on left column
    : 'left-[75%] -translate-x-1/2'; // Centered on right column

  return (
    <>
      {/* Floating selected text indicator - positioned above the corresponding column */}
      {(highlightedText || (isSelectedTextForThisStream && selectedText)) && (
        <div className={`fixed bottom-[120px] ${highlightPosition} z-20 bg-marble-800 border border-marble-700 rounded-md px-3 py-2 shadow-lg max-w-sm`}>
          <div className="text-xs text-marble-300 whitespace-nowrap overflow-hidden text-ellipsis">
            Selected: "{highlightedText || (isSelectedTextForThisStream ? selectedText : '')}"
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
            <div className="relative flex-1 max-w-xs flex">
              <input
                type="text"
                value={comment}
                onChange={handleCommentChange}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 text-sm bg-marble-900 border border-marble-800 rounded-l"
              />
              <button
                onClick={() => {
                  if (store.recordFeedback) {
                    const feedback = prepareFeedbackWithSelection(undefined);
                    store.recordFeedback(streamId, currentChunkIndex, feedback);
                    
                    if (store.showNextChunk) {
                      store.showNextChunk();
                    }
                  }
                }}
                className="px-3 py-2 text-sm bg-marble-800 hover:bg-marble-700 text-marble-300 border border-marble-800 rounded-r"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedbackPanel;