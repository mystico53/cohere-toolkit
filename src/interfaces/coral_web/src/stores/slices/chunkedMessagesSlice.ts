// src/stores/slices/chunkedMessagesSlice.ts

import { StateCreator } from 'zustand';
import { StoreState } from '..';

// Store the complete text and all feedback data
type chunkedMessagesState = {
  // Complete responses
  responses: {
    stream1: string;
    stream2: string;
  };
  
  // Track chunking
  chunks: {
    stream1: string[];
    stream2: string[];
  };
  
  // Feedback data per chunk
  feedback: {
    stream1: Array<{ rating?: 'positive' | 'negative'; comment?: string }>;
    stream2: Array<{ rating?: 'positive' | 'negative'; comment?: string }>;
  };
  
  // Current visible chunk index
  currentChunkIndex: number;
  
  // Track completion status
  isComplete: boolean;
  
  // Is testing mode active
  isChunked: boolean;
};

// Define actions for the slice
type chunkedMessagesActions = {
  startFeedbackSession: () => void;
  updateStreamContent: (streamId: 'stream1' | 'stream2', content: string) => void;
  completeStreams: () => void;
  createChunks: (chunkSize?: number) => void; // Changed from numChunks to chunkSize
  recordFeedback: (streamId: 'stream1' | 'stream2', feedback: { rating?: 'positive' | 'negative'; comment?: string }) => void;
  showNextChunk: () => void;
  resetFeedbackSession: () => void;
};

export type chunkedMessagesStore = {
  chunkedMessages: chunkedMessagesState;
} & chunkedMessagesActions;

// Initial state
const INITIAL_STATE: chunkedMessagesState = {
  responses: {
    stream1: '',
    stream2: '',
  },
  chunks: {
    stream1: [],
    stream2: [],
  },
  feedback: {
    stream1: [],
    stream2: [],
  },
  currentChunkIndex: 0,
  isComplete: false,
  isChunked: false,
};

export const createchunkedMessagesSlice: StateCreator<StoreState, [], [], chunkedMessagesStore> = (set, get) => ({
  chunkedMessages: INITIAL_STATE,
  
  startFeedbackSession: () => {
    set({
      chunkedMessages: {
        ...INITIAL_STATE,
        isChunked: true,
        currentChunkIndex: 0, // Explicitly reset to 0
      }
    });
  },
  
  updateStreamContent: (streamId, content) => {
    set((state) => ({
      chunkedMessages: {
        ...state.chunkedMessages,
        responses: {
          ...state.chunkedMessages.responses,
          [streamId]: content,
        }
      }
    }));
  },
  
  completeStreams: () => {
    set((state) => ({
      chunkedMessages: {
        ...state.chunkedMessages,
        isComplete: true,
        currentChunkIndex: 0, // Reset to 0 when streams complete
      }
    }));
    
    // Once complete, automatically create chunks
    get().createChunks();
  },
  
  createChunks: (maxChunkSize = 600) => { // 600 chars max
    set((state) => {
      const { stream1, stream2 } = state.chunkedMessages.responses;
      
      // Function to chunk text while preserving paragraph integrity
      const createTextChunks = (text: string): string[] => {
        const chunks: string[] = [];
        
        // Split text into blocks - consider both regular paragraphs and bullet points
        // This regex splits on double newlines OR on newline followed by bullet indicator
        const blocks = text.split(/\n\n+|\n(?=[•*-] )/);
        
        let currentChunk = '';
        let currentChunkSize = 0;
        
        // Helper to check if text contains a heading
        const isHeading = (text: string): boolean => {
          // Look for patterns like "Heading:" at the start of a line
          return /^[A-Z][a-zA-Z]*:/.test(text.trim());
        };
        
        // Process each block
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i].trim();
          if (!block) continue; // Skip empty blocks
          
          // Check if this block is a heading
          const blockIsHeading = isHeading(block);
          
          // Check if this block is a bullet point
          const isBulletPoint = /^[•*-] /.test(block);
          
          // Add leading newlines if needed
          const blockWithSpacing = currentChunk ? '\n\n' + block : block;
          const blockSize = blockWithSpacing.length;
          
          // Start a new chunk if:
          // 1. Adding this block would exceed the max size and we already have content, OR
          // 2. This block is a heading and we already have content
          if ((currentChunk && currentChunkSize + blockSize > maxChunkSize) || 
              (blockIsHeading && currentChunk)) {
            chunks.push(currentChunk);
            currentChunk = block;
            currentChunkSize = block.length;
          } 
          // Handle case where a single block is longer than max size
          else if (!currentChunk && blockSize > maxChunkSize) {
            // If it's a bullet point or heading, keep it together anyway
            if (isBulletPoint || blockIsHeading) {
              chunks.push(block);
            } else {
              // Split into sentences if possible
              const sentences = block.split(/(?<=\. )/);
              let sentenceChunk = '';
              
              for (const sentence of sentences) {
                if (sentenceChunk.length + sentence.length > maxChunkSize) {
                  if (sentenceChunk) {
                    chunks.push(sentenceChunk);
                    sentenceChunk = sentence;
                  } else {
                    // If a single sentence is too long, we have to split it
                    chunks.push(sentence);
                  }
                } else {
                  sentenceChunk += sentence;
                }
              }
              
              if (sentenceChunk) {
                chunks.push(sentenceChunk);
              }
            }
            
            // Reset current chunk to empty
            currentChunk = '';
            currentChunkSize = 0;
          } 
          // Normal case: add to current chunk
          else {
            currentChunk += blockWithSpacing;
            currentChunkSize += blockSize;
          }
        }
        
        // Add the final chunk if there's anything left
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // Now let's process and balance bullet points
        // For each chunk, check if it contains bullet points
        const balancedChunks: string[] = [];
        
        for (const chunk of chunks) {
          // If chunk is larger than max size and contains multiple bullet points
          if (chunk.length > maxChunkSize && chunk.match(/\n[•*-] /g)?.length > 1) {
            // Split at bullet points
            const bulletPoints = chunk.split(/(?=\n[•*-] )/);
            
            // First item may not start with a newline and bullet
            if (!bulletPoints[0].match(/^[•*-] /)) {
              // If first item is a heading + bullet, keep them together
              if (isHeading(bulletPoints[0])) {
                // Add the heading to the first bullet point
                if (bulletPoints.length > 1) {
                  bulletPoints[1] = bulletPoints[0] + bulletPoints[1];
                  bulletPoints.shift();
                }
              }
            }
            
            let subChunk = '';
            for (const bullet of bulletPoints) {
              // If adding this bullet would exceed max size, start a new chunk
              if (subChunk && subChunk.length + bullet.length > maxChunkSize) {
                balancedChunks.push(subChunk);
                subChunk = bullet;
              } else {
                subChunk += subChunk ? bullet : bullet;
              }
            }
            
            // Add any remaining content
            if (subChunk) {
              balancedChunks.push(subChunk);
            }
          } else {
            // Regular chunk, no special handling needed
            balancedChunks.push(chunk);
          }
        }
        
        return balancedChunks;
      };
      
      // Create chunks for each stream
      const stream1Chunks = createTextChunks(stream1);
      const stream2Chunks = createTextChunks(stream2);
      
      // Create empty feedback slots for each chunk
      const createEmptyFeedback = (count: number) => {
        return Array(count).fill(null).map(() => ({}));
      };
      
      return {
        chunkedMessages: {
          ...state.chunkedMessages,
          chunks: {
            stream1: stream1Chunks,
            stream2: stream2Chunks,
          },
          feedback: {
            stream1: createEmptyFeedback(stream1Chunks.length),
            stream2: createEmptyFeedback(stream2Chunks.length),
          }
        }
      };
    });
  },
  
  recordFeedback: (streamId, chunkFeedback) => {
    set((state) => {
      const currentIndex = state.chunkedMessages.currentChunkIndex;
      const updatedFeedback = {
        ...state.chunkedMessages.feedback,
        [streamId]: [
          ...state.chunkedMessages.feedback[streamId].slice(0, currentIndex),
          chunkFeedback,
          ...state.chunkedMessages.feedback[streamId].slice(currentIndex + 1)
        ]
      };
      
      return {
        chunkedMessages: {
          ...state.chunkedMessages,
          feedback: updatedFeedback
        }
      };
    });
  },
  
  showNextChunk: () => {
    set((state) => {
      const nextIndex = state.chunkedMessages.currentChunkIndex + 1;
      const stream1MaxIndex = state.chunkedMessages.chunks.stream1.length - 1;
      const stream2MaxIndex = state.chunkedMessages.chunks.stream2.length - 1;
      
      // If we've reached the end of one stream but not the other,
      // combine all remaining chunks of the longer stream into one big chunk
      if (nextIndex > stream1MaxIndex || nextIndex > stream2MaxIndex) {
        // Only do this operation if we haven't already done it
        const stream1Chunks = [...state.chunkedMessages.chunks.stream1];
        const stream2Chunks = [...state.chunkedMessages.chunks.stream2];
        
        // Determine which stream is longer (if any)
        if (stream1MaxIndex > nextIndex && stream1MaxIndex > stream2MaxIndex) {
          // Stream 1 has more chunks
          const combinedChunk = stream1Chunks.slice(nextIndex).join('');
          stream1Chunks.splice(nextIndex, stream1Chunks.length - nextIndex, combinedChunk);
        } else if (stream2MaxIndex > nextIndex && stream2MaxIndex > stream1MaxIndex) {
          // Stream 2 has more chunks
          const combinedChunk = stream2Chunks.slice(nextIndex).join('');
          stream2Chunks.splice(nextIndex, stream2Chunks.length - nextIndex, combinedChunk);
        }
        
        // Update feedback arrays to match the new chunk counts
        const updatedFeedback1 = state.chunkedMessages.feedback.stream1.slice(0, stream1Chunks.length);
        const updatedFeedback2 = state.chunkedMessages.feedback.stream2.slice(0, stream2Chunks.length);
        
        // Make sure we have feedback slots for all chunks
        while (updatedFeedback1.length < stream1Chunks.length) {
          updatedFeedback1.push({});
        }
        while (updatedFeedback2.length < stream2Chunks.length) {
          updatedFeedback2.push({});
        }
        
        return {
          chunkedMessages: {
            ...state.chunkedMessages,
            chunks: {
              stream1: stream1Chunks,
              stream2: stream2Chunks,
            },
            feedback: {
              stream1: updatedFeedback1,
              stream2: updatedFeedback2,
            },
            currentChunkIndex: nextIndex
          }
        };
      }
      
      // Otherwise, just move to the next chunk
      const maxIndex = Math.max(stream1MaxIndex, stream2MaxIndex);
      return {
        chunkedMessages: {
          ...state.chunkedMessages,
          currentChunkIndex: Math.min(nextIndex, maxIndex)
        }
      };
    });
  },
  
  resetFeedbackSession: () => {
    set({
      chunkedMessages: INITIAL_STATE
    });
  }
});