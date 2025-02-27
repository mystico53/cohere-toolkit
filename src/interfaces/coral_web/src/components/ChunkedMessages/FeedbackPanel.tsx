import React from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type FeedbackPanelProps = {
  streamId: 'stream1' | 'stream2';
};

const FeedbackPanel = ({ streamId }: FeedbackPanelProps) => {
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
  
  // Handle thumbs up click
  const handleThumbsUp = () => {
    if (store.recordFeedback) {
      store.recordFeedback(streamId, currentChunkIndex, {
        rating: 'positive',
        timestamp: Date.now()
      });
    }
  };
  
  // Handle thumbs down click
  const handleThumbsDown = () => {
    if (store.recordFeedback) {
      store.recordFeedback(streamId, currentChunkIndex, {
        rating: 'negative',
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className={`absolute bottom-[60px] ${position} border-t border-marble-950 bg-marble-1000 px-4 py-3 z-9`}>
      <div className="text-sm font-medium text-marble-400">
        Feedback Summary for Response {streamId === 'stream1' ? '1' : '2'}
      </div>
      <div className="mt-2 text-sm flex flex-col space-y-2">
        <div className="flex items-center">
          <span className="mr-3">Current chunk:</span>
          <div className="flex space-x-2">
            <button
              onClick={handleThumbsUp}
              className={`p-2 rounded-full ${
                currentFeedback?.rating === 'positive'
                  ? 'bg-green-700 text-white'
                  : 'bg-marble-900 hover:bg-marble-800'
              }`}
              aria-label="Thumbs up"
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
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2"></path>
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        {currentFeedback?.rating && (
          <div className="text-sm text-marble-400">
            Feedback recorded: {currentFeedback.rating === 'positive' ? 'Positive 👍' : 'Negative 👎'}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPanel;