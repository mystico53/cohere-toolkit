"use client";

import React, { useState } from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

/**
 * Debug component to visualize the state of the chunkedMessages store
 */
const ChunkedMessagesDebug: React.FC = () => {
  const { chunkedMessages } = usechunkedMessagesStore();
  const [expanded, setExpanded] = useState(true);

  // Toggle expanded state
  const toggleExpanded = () => setExpanded(!expanded);

  // Format JSON with indentation for better readability
  const prettyState = chunkedMessages ? JSON.stringify(chunkedMessages, null, 2) : "{}";

  // Safely count total chunks for each stream
  const chunk1Count = chunkedMessages?.chunks?.stream1?.length || 0;
  const chunk2Count = chunkedMessages?.chunks?.stream2?.length || 0;

  if (!chunkedMessages) {
    return (
      <div className="my-4 p-4 bg-gray-800 text-gray-300 rounded-md">
        <p>Loading chunked messages data...</p>
      </div>
    );
  }

  return (
    <div className="my-4 border border-gray-700 rounded-md overflow-hidden h-[1800px]">
      <div 
        onClick={toggleExpanded} 
        className="bg-gray-800 p-3 cursor-pointer font-medium flex justify-between items-center"
      >
        <span>Chunked Messages Debug</span>
        <span>{expanded ? '[-]' : '[+]'}</span>
      </div>
      
      {expanded && (
        <div className="bg-gray-900 text-gray-300">
          {/* Status section - keep this visible and compact */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-800">
            <div className="flex space-x-4">
              <div><strong>Status:</strong> {chunkedMessages.isComplete ? 'Complete' : 'Streaming'}</div>
              <div><strong>Mode:</strong> {chunkedMessages.isChunked ? 'ON' : 'OFF'}</div>
            </div>
            <div className="flex space-x-4 justify-end">
              <div><strong>Chunk:</strong> {(chunkedMessages.currentChunkIndex || 0) + 1}</div>
              <div><strong>Total:</strong> {chunk1Count}</div>
              <div><strong>S1:</strong> {chunkedMessages.responses?.stream1?.length || 0} chars</div>
              <div><strong>S2:</strong> {chunkedMessages.responses?.stream2?.length || 0} chars</div>
            </div>
          </div>
          
          {/* Current chunk section - scrollable container */}
          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
            <div className="p-3">
              <h3 className="text-sm font-medium mb-2">Current Chunk</h3>
              {chunkedMessages.currentChunkIndex < chunk1Count && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-800 border-l-4 border-blue-500 rounded-r-md text-xs">
                    <div className="font-medium mb-1">Stream 1</div>
                    <div className="whitespace-pre-wrap break-words">
                      {chunkedMessages.chunks?.stream1?.[chunkedMessages.currentChunkIndex] || "Empty"}
                    </div>
                  </div>
                  <div className="p-2 bg-gray-800 border-l-4 border-purple-500 rounded-r-md text-xs">
                    <div className="font-medium mb-1">Stream 2</div>
                    <div className="whitespace-pre-wrap break-words">
                      {chunkedMessages.chunks?.stream2?.[chunkedMessages.currentChunkIndex] || "Empty"}
                    </div>
                  </div>
                </div>
              )}
            
              {/* All chunks section */}
              <h3 className="text-sm font-medium mt-4 mb-2">All Chunks</h3>
              
              <div className="grid grid-cols-2 gap-2 mb-1">
                <div className="font-medium p-1 bg-gray-800 text-center text-xs">Stream 1</div>
                <div className="font-medium p-1 bg-gray-800 text-center text-xs">Stream 2</div>
              </div>
              
              {Array.from({ length: Math.max(chunk1Count, chunk2Count) }).map((_, index) => (
                <div 
                  key={`chunk-${index}`} 
                  className={`grid grid-cols-2 gap-2 mb-2 ${
                    chunkedMessages.currentChunkIndex === index ? 'bg-gray-800 bg-opacity-30' : ''
                  }`}
                >
                  <div className="p-2 bg-gray-800 border-l-4 border-blue-500 rounded-r-md">
                    <div className="font-medium mb-1 text-xs">Chunk {index + 1}</div>
                    <div className="whitespace-pre-wrap break-words max-h-24 overflow-y-auto text-xs">
                      {chunkedMessages.chunks?.stream1?.[index] || "Empty"}
                    </div>
                  </div>
                  <div className="p-2 bg-gray-800 border-l-4 border-purple-500 rounded-r-md">
                    <div className="font-medium mb-1 text-xs">Chunk {index + 1}</div>
                    <div className="whitespace-pre-wrap break-words max-h-24 overflow-y-auto text-xs">
                      {chunkedMessages.chunks?.stream2?.[index] || "Empty"}
                    </div>
                  </div>
                </div>
              ))}
            
              {/* Full state section */}
              <details className="mt-2">
                <summary className="cursor-pointer p-1 bg-gray-800 rounded text-xs">Full State</summary>
                <pre className="p-2 bg-gray-800 mt-1 overflow-auto max-h-40 text-xs rounded">
                  {prettyState}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  ); // Added missing closing parenthesis here
};

export default ChunkedMessagesDebug;