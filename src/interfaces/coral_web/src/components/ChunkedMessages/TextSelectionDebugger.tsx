// TextSelectionDebugger.tsx
// Add this component to your ChunkedMessagesComponent to debug text selection

import React, { useEffect } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

const TextSelectionDebugger = () => {
  const store = usechunkedMessagesStore();
  const { chunkedMessages } = store;
  
  useEffect(() => {
    console.log('[DEBUG] Store state:', {
      selectedText: chunkedMessages?.selectedText,
      activeFeedback: chunkedMessages?.activeFeedback,
      currentIndices: chunkedMessages?.currentChunkIndices
    });
  }, [
    chunkedMessages?.selectedText,
    chunkedMessages?.activeFeedback?.streamId,
    chunkedMessages?.activeFeedback?.chunkIndex,
    chunkedMessages?.currentChunkIndices?.stream1,
    chunkedMessages?.currentChunkIndices?.stream2
  ]);
  
  if (!chunkedMessages) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded z-50 text-xs max-w-md">
      <h3 className="font-bold mb-1">Text Selection Debug</h3>
      <div className="space-y-1">
        <div><strong>Selected Text:</strong> {chunkedMessages.selectedText ? `"${chunkedMessages.selectedText.substring(0, 30)}${chunkedMessages.selectedText.length > 30 ? '...' : ''}"` : '(none)'}</div>
        <div><strong>Active Stream:</strong> {chunkedMessages.activeFeedback?.streamId || 'none'}</div>
        <div><strong>Active Chunk:</strong> {chunkedMessages.activeFeedback?.chunkIndex !== null ? chunkedMessages.activeFeedback.chunkIndex : 'none'}</div>
        <div><strong>Current Indices:</strong> Stream1: {chunkedMessages.currentChunkIndices?.stream1}, Stream2: {chunkedMessages.currentChunkIndices?.stream2}</div>
      </div>
    </div>
  );
};

export default TextSelectionDebugger;