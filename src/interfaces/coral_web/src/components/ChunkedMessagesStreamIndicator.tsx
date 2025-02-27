import React, { useState, useEffect, useRef } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

// This component specifically monitors response character count changes
const StreamLoadingIndicator = () => {
  const { chunkedMessages } = usechunkedMessagesStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [charCount, setCharCount] = useState(0);
  
  // Store previous character counts to detect changes
  const prevCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Get current character count
    const currentCount = chunkedMessages?.responses?.stream1?.length || 0;
    
    // Update displayed count
    setCharCount(currentCount);
    
    // If count changed, we're streaming
    if (currentCount > prevCountRef.current) {
      setIsStreaming(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set timeout to hide indicator if no changes for 1.5 seconds
      timeoutRef.current = setTimeout(() => {
        setIsStreaming(false);
      }, 1500);
    }
    
    // Update previous count
    prevCountRef.current = currentCount;
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [chunkedMessages?.responses?.stream1?.length]);
  
  // Don't render anything if not streaming or no characters
  if (!isStreaming || charCount === 0) {
    return null;
  }
  
  return (
    <div className="ml-3 text-sm bg-marble-800 px-2 py-1 rounded-md text-blue-300 animate-pulse">
      Reading responses ({charCount} chars)
    </div>
  );
};

export default StreamLoadingIndicator;