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
  // Debug state to show when feedback is saved
  const [debugMessage, setDebugMessage] = useState('');
  
  // Access the store safely with defensive checks
  const store = usechunkedMessagesStore();
  
  // Safely get the current chunk index with a fallback to 0
  const currentChunkIndex = store.chunkedMessages?.currentChunkIndices?.[streamId] ?? 0;
  
  // Add text selection handling
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || !selection.toString().trim()) return;
      
      // Get the selection text
      const text = selection.toString().trim();
      
      // Determine if the selection is in this stream's half of the screen
      const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      const middleOfScreen = window.innerWidth / 2;
      
      const isInThisStream = 
        (streamId === 'stream1' && selectionRect.left < middleOfScreen) ||
        (streamId === 'stream2' && selectionRect.right >= middleOfScreen);
      
      if (isInThisStream && store.setSelectedText) {
        console.log(`[${streamId} Panel] Selection detected:`, text);
        store.setSelectedText(text, streamId, currentChunkIndex);
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [streamId, currentChunkIndex, store]);
  
  // Debug logging for data flow
  useEffect(() => {
    console.log(`[${streamId} Panel] Render with:`, {
      storeState: store.chunkedMessages ? 'exists' : 'undefined',
      selectedText: store.chunkedMessages?.selectedText || '(none)',
      activeFeedbackStream: store.chunkedMessages?.activeFeedback?.streamId || 'none',
      activeFeedbackChunk: store.chunkedMessages?.activeFeedback?.chunkIndex ?? 'none',
      currentChunkIndex,
      isForThisStream: store.chunkedMessages?.activeFeedback?.streamId === streamId
    });
  }, [store.chunkedMessages, streamId, currentChunkIndex]);
  
  // Get the currently selected text from the store
  const selectedText = store.chunkedMessages?.selectedText || '';
  const activeFeedback = store.chunkedMessages?.activeFeedback || { streamId: null, chunkIndex: null };
  
  // Only show selected text if it belongs to this panel's stream
  const isSelectedTextForThisStream = activeFeedback?.streamId === streamId;
  const displaySelectedText = isSelectedTextForThisStream ? selectedText : '';
  
  // Debug this specific calculation
  useEffect(() => {
    console.log(`[${streamId} Panel] Selection check:`, {
      selectedText,
      activeFeedbackStream: activeFeedback?.streamId,
      thisStreamId: streamId,
      isForThisStream: isSelectedTextForThisStream,
      willDisplay: displaySelectedText ? 'yes' : 'no',
      textLength: displaySelectedText?.length || 0
    });
  }, [selectedText, activeFeedback?.streamId, streamId, isSelectedTextForThisStream, displaySelectedText]);
  
  // Safely get current feedback for this chunk (if any)
  const getFeedbackSafely = () => {
    if (!store.chunkedMessages?.feedback?.[streamId]) return undefined;
    return store.chunkedMessages.feedback[streamId][currentChunkIndex];
  };
  
  const currentFeedback = getFeedbackSafely();
  
  // Initialize comment field with existing comment when chunk changes
  useEffect(() => {
    setComment(currentFeedback?.comment || '');
    setDebugMessage('');
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
  
  // Handle thumbs up click with comment and selected text
  const handleThumbsUp = () => {
    if (store.recordFeedback) {
      const feedback = prepareFeedbackWithSelection('positive');
      console.log(`[${streamId} Panel] Recording positive feedback:`, feedback);
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Show debug message
      setDebugMessage(`✅ Saved positive feedback for ${streamId}, chunk ${currentChunkIndex}`);
      
      // Clear the selected text after saving
      if (store.clearSelectedText) {
        console.log(`[${streamId} Panel] Clearing selected text`);
        store.clearSelectedText();
      }
      
      // Add this line to advance both streams after feedback
      if (store.showNextChunk) {
        store.showNextChunk();
      }
    }
  };
  
  // Handle thumbs down click with comment and selected text
  const handleThumbsDown = () => {
    if (store.recordFeedback) {
      const feedback = prepareFeedbackWithSelection('negative');
      console.log(`[${streamId} Panel] Recording negative feedback:`, feedback);
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Show debug message
      setDebugMessage(`✅ Saved negative feedback for ${streamId}, chunk ${currentChunkIndex}`);
      
      // Clear the selected text after saving
      if (store.clearSelectedText) {
        console.log(`[${streamId} Panel] Clearing selected text`);
        store.clearSelectedText();
      }
      
      // Add this line to advance both streams after feedback
      if (store.showNextChunk) {
        store.showNextChunk();
      }
    }
  };
  
  // Handle comment changes
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };
  
  // Save comment and selected text (without changing rating)
  const handleSaveComment = () => {
    if (store.recordFeedback) {
      // Preserve existing rating if any
      const feedback = prepareFeedbackWithSelection(currentFeedback?.rating);
      console.log(`[${streamId} Panel] Saving comment with feedback:`, feedback);
      
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Show debug message
      setDebugMessage(`✅ Saved comment for ${streamId}, chunk ${currentChunkIndex}`);
      
      // Clear the selected text after saving
      if (store.clearSelectedText) {
        console.log(`[${streamId} Panel] Clearing selected text`);
        store.clearSelectedText();
      }
      
      // Add this line to advance both streams after feedback
      if (store.showNextChunk) {
        store.showNextChunk();
      }
    }
  };

  return (
    <div 
      ref={panelRef}
      className="border-t border-marble-950 bg-marble-1000 px-4 py-3 z-9 min-h-[110px]"
    >
      <div className="text-sm font-medium text-marble-400 flex justify-between items-center">
        <span>Feedback Summary for Response {streamId === 'stream1' ? '1' : '2'}</span>
        <span className="text-xs text-marble-500">
          {isSelectedTextForThisStream && selectedText ? '✓ Has selection' : ''}
        </span>
      </div>
      {/* Selected Text Section - Positioned to expand upwards with more height */}
      {displaySelectedText && (
        <div className="absolute bottom-full left-0 right-0 p-3 mb-2 mx-4 border-2 border-marble-700 bg-marble-900 rounded text-xs z-10 shadow-lg max-h-[200px] overflow-y-auto">
          <div className="font-medium mb-2 text-marble-300 text-sm">Selected Text:</div>
          <div className="italic bg-marble-800 p-2 rounded">{displaySelectedText}</div>
        </div>
      )}
      
      <div className="mt-2 text-sm flex flex-col space-y-3">
        
        {/* Feedback controls row */}
        <div className="flex items-center space-x-2">
          {/* Rating buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleThumbsUp}
              className={`p-2 rounded-full ${
                currentFeedback?.rating === 'positive'
                  ? 'bg-green-700 text-white'
                  : 'bg-marble-900 hover:bg-marble-800'
              }`}
              aria-label="Thumbs up"
              title="Positive feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12"></path>
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
              </svg>
            </button>
            <button
              onClick={handleThumbsDown}
              className={`p-2 rounded-full ${
                currentFeedback?.rating === 'negative'
                  ? 'bg-red-700 text-white'
                  : 'bg-marble-900 hover:bg-marble-800'
              }`}
              aria-label="Thumbs down"
              title="Negative feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2"></path>
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
              </svg>
            </button>
          </div>
          
          {/* Comment input field */}
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              value={comment}
              onChange={handleCommentChange}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1 text-sm bg-marble-900 border border-marble-800 rounded"
            />
            <button
              onClick={handleSaveComment}
              className="px-3 py-1 text-sm bg-marble-800 hover:bg-marble-700 rounded"
              title="Save comment and selected text"
            >
              Save
            </button>
          </div>
        </div>
        
        {/* Feedback status display */}
        <div className="flex flex-col space-y-1">
          {currentFeedback?.rating && (
            <div className="text-sm text-marble-400">
              Rating: {currentFeedback.rating === 'positive' ? 'Positive 👍' : 'Negative 👎'}
            </div>
          )}
          
          {/* Show saved comment if any */}
          {currentFeedback?.comment && (
            <div className="text-sm text-marble-400">
              Comment: "{currentFeedback.comment}"
            </div>
          )}
          
          {/* Show saved selected text if any */}
          {currentFeedback?.selectedText && (
            <div className="text-sm text-marble-400">
              Saved text: "{currentFeedback.selectedText.substring(0, 50)}{currentFeedback.selectedText.length > 50 ? '...' : ''}"
            </div>
          )}
        </div>
        
        {/* Debug message */}
        {debugMessage && (
          <div className="text-xs text-green-500 mt-1">
            {debugMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPanel;