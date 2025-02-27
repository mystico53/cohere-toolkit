import React, { useState, useEffect } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type FeedbackPanelProps = {
  streamId: 'stream1' | 'stream2';
};

const FeedbackPanel = ({ streamId }: FeedbackPanelProps) => {
  // Local state for the comment input
  const [comment, setComment] = useState('');
  // Debug state to show when feedback is saved
  const [debugMessage, setDebugMessage] = useState('');
  
  // Access the store safely with defensive checks
  const store = usechunkedMessagesStore();
  
  // Calculate position based on streamId
  const position = streamId === 'stream1' 
    ? 'left-0 right-1/2 pr-3' // Left half 
    : 'left-1/2 right-0 pl-3'; // Right half
  
  // Safely get the current chunk index with a fallback to 0
  const currentChunkIndex = store.chunkedMessages?.currentChunkIndices?.[streamId] ?? 0;
  
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
  }, [currentChunkIndex, streamId]);
  
  // Handle thumbs up click with comment
  const handleThumbsUp = () => {
    if (store.recordFeedback) {
      const feedback = {
        rating: 'positive',
        comment: comment.trim(),
        timestamp: Date.now()
      };
      
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Show debug message
      setDebugMessage(`✅ Saved positive feedback for ${streamId}, chunk ${currentChunkIndex}`);
      console.log('Saved feedback:', { streamId, chunkIndex: currentChunkIndex, feedback });
    }
  };
  
  // Handle thumbs down click with comment
  const handleThumbsDown = () => {
    if (store.recordFeedback) {
      const feedback = {
        rating: 'negative',
        comment: comment.trim(),
        timestamp: Date.now()
      };
      
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Show debug message
      setDebugMessage(`✅ Saved negative feedback for ${streamId}, chunk ${currentChunkIndex}`);
      console.log('Saved feedback:', { streamId, chunkIndex: currentChunkIndex, feedback });
    }
  };
  
  // Handle comment changes
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };
  
  // Save comment only (without changing rating)
  const handleSaveComment = () => {
    if (store.recordFeedback) {
      // Preserve existing rating if any
      const feedback = {
        rating: currentFeedback?.rating,
        comment: comment.trim(),
        timestamp: Date.now()
      };
      
      store.recordFeedback(streamId, currentChunkIndex, feedback);
      
      // Show debug message
      setDebugMessage(`✅ Saved comment for ${streamId}, chunk ${currentChunkIndex}`);
      console.log('Saved comment:', { streamId, chunkIndex: currentChunkIndex, comment: comment.trim() });
    }
  };

  return (
    <div className={`absolute bottom-[60px] ${position} border-t border-marble-950 bg-marble-1000 px-4 py-3 z-9`}>
      <div className="text-sm font-medium text-marble-400">
        Feedback Summary for Response {streamId === 'stream1' ? '1' : '2'}
      </div>
      <div className="mt-2 text-sm flex flex-col space-y-2">
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
              title="Save comment only"
            >
              Save
            </button>
          </div>
        </div>
        
        {/* Feedback status display */}
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