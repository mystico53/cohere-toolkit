'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Welcome } from '@/components/Welcome';
import { usechunkedMessagesStore } from '@/stores/persistedStore';
import MessageStreamColumn from './MessageStreamColumn';
import ChunkedControlPanel from './ChunkedControlPanel';
import useTextSelection from '@/hooks/useTextSelection';
import FeedbackPanel from './FeedbackPanel';

type ChunkedMessagesProps = {
  agentId: string; 
  onRetry: () => void;
  // Add any other props from the MessagingContainer that might be passed
  isStreaming?: boolean;
  isStreamingToolEvents?: boolean;
  messages?: any[];
  streamingMessage?: any;
  streamingMessage1?: any;
  streamingMessage2?: any;
};

// Make sure the component properly accepts and forwards the ref
const ChunkedMessagesComponent = forwardRef<HTMLDivElement, ChunkedMessagesProps>(
  function ChunkedMessagesInternal(props, ref) {
    const { agentId, onRetry } = props;
    const chunksContainerRef = useRef<HTMLDivElement>(null);
    const [feedbackComment, setFeedbackComment] = useState('');
    
    // Use our text selection hook with the container ref
    const {
      selectedText,
      clearSelection
    } = useTextSelection(chunksContainerRef);
    
    // Get data from the chunkedMessages store
    const { 
      chunkedMessages, 
      showNextChunk, 
      showNextChunkForStream, 
      startFeedbackSession,
      resetEverything,
      recordFeedback,
      setSelectedText,
      clearSelectedText
    } = usechunkedMessagesStore();
    
    // Helper function to scroll to the bottom
    const scrollToBottom = () => {
      if (chunksContainerRef.current) {
        chunksContainerRef.current.scrollTop = chunksContainerRef.current.scrollHeight;
      }
    };
    
    // Scroll to bottom when chunks change
    useEffect(() => {
      scrollToBottom();
    }, [
      chunkedMessages?.chunks?.stream1?.length, 
      chunkedMessages?.chunks?.stream2?.length,
      chunkedMessages?.currentChunkIndices?.stream1,
      chunkedMessages?.currentChunkIndices?.stream2
    ]);
    
    // Sync selected text to store
    useEffect(() => {
      if (selectedText && chunkedMessages) {
        // For simplicity, we'll associate the selection with the current chunk
        // of stream1, but in a real implementation you'd want to determine which
        // stream and chunk the selection belongs to
        const stream1Index = chunkedMessages.currentChunkIndices?.stream1 || 0;
        setSelectedText(selectedText, 'stream1', stream1Index);
      }
    }, [selectedText, chunkedMessages, setSelectedText]);
    
    // Debug logging
    useEffect(() => { 
      // Auto-start feedback session if not already started
      if (chunkedMessages && !chunkedMessages.isChunked && 
          chunkedMessages?.chunks?.stream1?.length > 0) {
        console.log("[DEBUG] Auto-starting feedback session");
        startFeedbackSession();
      }
    }, [chunkedMessages, startFeedbackSession]);
    
    // Handle start over
    const handleStartOver = () => {
      resetEverything();
      clearSelection();
      setFeedbackComment('');
    };
    
    // Handle feedback for a stream
    const handleFeedback = (streamId: 'stream1' | 'stream2', rating: 'positive' | 'negative') => {
      const currentIndex = chunkedMessages?.currentChunkIndices?.[streamId] || 0;
      recordFeedback(streamId, currentIndex, { 
        rating, 
        comment: feedbackComment,
        selectedText: selectedText
      });
      clearSelection();
      setFeedbackComment('');
    };
    
    // Handle submit feedback from control panel
    const handleSubmitFeedback = () => {
      if (chunkedMessages?.activeFeedback?.streamId && 
          chunkedMessages.activeFeedback.chunkIndex !== null) {
        recordFeedback(
          chunkedMessages.activeFeedback.streamId, 
          chunkedMessages.activeFeedback.chunkIndex, 
          { 
            comment: feedbackComment,
            selectedText: selectedText 
          }
        );
        clearSelection();
        setFeedbackComment('');
      }
    };
    
    // Handle text selection from a stream
    const handleTextSelect = (text: string) => {
      // Just rely on the hook and effect to handle this
    };
    
    // Always render even if there are no chunks yet
    const stream1Chunks = chunkedMessages?.chunks?.stream1 || [];
    const stream2Chunks = chunkedMessages?.chunks?.stream2 || [];
    const currentIndices = chunkedMessages?.currentChunkIndices || { stream1: 0, stream2: 0 };
    
    // Show welcome only if chunkedMessages is completely undefined
    if (!chunkedMessages) {
      return (
        <div className="m-auto p-4">
          <Welcome show={true} agentId={agentId} />
        </div>
      );
    }
    
    // Calculate progress using stream1 for simplicity
    const stream1TotalChunks = stream1Chunks.length || 0;
    const stream1Progress = stream1TotalChunks > 0 
      ? ((currentIndices.stream1 + 1) / stream1TotalChunks) * 100 
      : 0;
    
    // Check if there are more chunks to show
    const hasMoreChunks = 
      (stream1Chunks.length > 0 && currentIndices.stream1 < stream1Chunks.length - 1) ||
      (stream2Chunks.length > 0 && currentIndices.stream2 < stream2Chunks.length - 1);

      return (
        <div className="flex flex-col h-full relative overflow-hidden" ref={ref}>
          {/* Content area with explicit height to enable scrolling */}
          <div 
            ref={chunksContainerRef}
            className="flex-grow flex flex-col overflow-y-auto w-full px-4 py-6"
            style={{ height: 'calc(100% - 140px)', scrollBehavior: 'smooth' }} // Increased to account for feedback panels
          >
            <div className="grid grid-cols-2 gap-6 mt-auto"> {/* mt-auto pushes content to bottom */}
              {/* Left column: Stream 1 */}
              <MessageStreamColumn
                streamId="stream1"
                chunks={stream1Chunks}
                currentIndex={currentIndices.stream1}
                onChunkClick={() => showNextChunkForStream('stream1')}
                onFeedbackSelect={(rating) => handleFeedback('stream1', rating)}
                onTextSelect={handleTextSelect}
              />
              
              {/* Right column: Stream 2 */}
              <MessageStreamColumn
                streamId="stream2"
                chunks={stream2Chunks}
                currentIndex={currentIndices.stream2}
                onChunkClick={() => showNextChunkForStream('stream2')}
                onFeedbackSelect={(rating) => handleFeedback('stream2', rating)}
                onTextSelect={handleTextSelect}
              />
            </div>
          </div>
          
          {/* Feedback Panels - Fixed position above control panel */}
          <FeedbackPanel streamId="stream1" />
          <FeedbackPanel streamId="stream2" />
          
          {/* Control Panel */}
          <ChunkedControlPanel
            progress={stream1Progress}
            selectedText={selectedText}
            feedbackComment={feedbackComment}
            hasMoreChunks={hasMoreChunks}
            onNextChunk={showNextChunk}
            onStartOver={handleStartOver}
            onFeedbackCommentChange={setFeedbackComment}
            onSubmitFeedback={handleSubmitFeedback}
          />
        </div>
      );
  }
);

export default ChunkedMessagesComponent;