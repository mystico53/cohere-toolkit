"use client";

import React, { useState } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

/**
 * Debug component to visualize the state of the chunkedMessages store
 */
const ChunkedMessagesDebug: React.FC = () => {
  const { chunkedMessages } = usechunkedMessagesStore();
  const [expanded, setExpanded] = useState(false);

  // Toggle expanded state
  const toggleExpanded = () => setExpanded(!expanded);

  // Format JSON with indentation for better readability
  const prettyState = chunkedMessages ? JSON.stringify(chunkedMessages, null, 2) : "{}";

  // Safely count total chunks for each stream
  const chunk1Count = chunkedMessages?.chunks?.stream1?.length || 0;
  const chunk2Count = chunkedMessages?.chunks?.stream2?.length || 0;

  if (!chunkedMessages) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          width: '180px',
          padding: '8px 12px',
          backgroundColor: '#282c34',
          color: '#abb2bf',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '12px',
          zIndex: 9999,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
        }}
      >
        Loading store data...
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: expanded ? '500px' : '180px',
        maxHeight: expanded ? '80vh' : '40px',
        overflow: 'auto',
        backgroundColor: '#282c34',
        color: '#abb2bf',
        padding: '8px 12px',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease'
      }}
    >
      <div 
        onClick={toggleExpanded} 
        style={{ 
          cursor: 'pointer',
          marginBottom: expanded ? '8px' : '0',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>Chunked Messages Debug</span>
        <span>{expanded ? '[-]' : '[+]'}</span>
      </div>
      
      {expanded && (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Status: {chunkedMessages.isComplete ? 'Complete' : 'Streaming'}</span>
              <span>Chunked Mode: {chunkedMessages.isChunked ? 'ON' : 'OFF'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current Chunk: {(chunkedMessages.currentChunkIndex || 0) + 1}</span>
              <span>Total Chunks: {chunk1Count}</span>
            </div>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div>Stream 1: {chunkedMessages.responses?.stream1?.length || 0} chars</div>
            <div>Stream 2: {chunkedMessages.responses?.stream2?.length || 0} chars</div>
          </div>
          
          {chunkedMessages.chunks?.stream1 && chunkedMessages.chunks?.stream2 && (
            <div style={{ marginBottom: '8px' }}>
              <div>Current Chunk Contents:</div>
              {chunkedMessages.currentChunkIndex < chunk1Count && (
                <>
                  <div style={{ 
                    padding: '4px', 
                    marginTop: '4px', 
                    background: '#1e2127', 
                    borderLeft: '3px solid #61afef'
                  }}>
                    Stream 1: {chunkedMessages.chunks.stream1[chunkedMessages.currentChunkIndex]?.slice(0, 100) || ""}
                    {chunkedMessages.chunks.stream1[chunkedMessages.currentChunkIndex]?.length > 100 ? "..." : ""}
                  </div>
                  <div style={{ 
                    padding: '4px', 
                    marginTop: '4px', 
                    background: '#1e2127', 
                    borderLeft: '3px solid #c678dd'
                  }}>
                    Stream 2: {chunkedMessages.chunks.stream2[chunkedMessages.currentChunkIndex]?.slice(0, 100) || ""}
                    {chunkedMessages.chunks.stream2[chunkedMessages.currentChunkIndex]?.length > 100 ? "..." : ""}
                  </div>
                </>
              )}
            </div>
          )}
          
          {chunkedMessages.feedback?.stream1 && (
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Feedback Summary</summary>
              <div style={{ marginBottom: '12px' }}>
                {chunkedMessages.feedback.stream1.map((feedback, index) => (
                  <div key={`s1-${index}`} style={{ marginBottom: '4px' }}>
                    Chunk {index + 1}: 
                    {feedback && feedback.rating 
                      ? ` ${feedback.rating} ${feedback.comment ? `(${feedback.comment})` : ''}` 
                      : ' No feedback'}
                  </div>
                ))}
              </div>
            </details>
          )}
          
          <details>
            <summary style={{ cursor: 'pointer' }}>Full State</summary>
            <pre style={{ 
              overflow: 'auto', 
              maxHeight: '300px',
              background: '#1e2127',
              padding: '8px',
              borderRadius: '4px',
              marginTop: '8px'
            }}>{prettyState}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ChunkedMessagesDebug;