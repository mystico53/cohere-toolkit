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
  
  createChunks: (targetChunkSize = 300) => {
    set((state) => {
      const { stream1, stream2 } = state.chunkedMessages.responses;
      
      // Find natural break points in text (paragraphs, sentences, bullet points)
      const findBreakPoints = (text: string): number[] => {
        const breakPoints: number[] = [];
        
        // Add paragraph breaks (double newlines)
        let index = text.indexOf('\n\n');
        while (index !== -1) {
          breakPoints.push(index + 2); // Include both newlines
          index = text.indexOf('\n\n', index + 1);
        }
        
        // Add bullet point breaks
        const bulletPointRegex = /\n[•*-] /g;
        let match: RegExpExecArray | null;
        while ((match = bulletPointRegex.exec(text)) !== null) {
          // Only add if not already in breakpoints (avoid duplicates with paragraph breaks)
          if (!breakPoints.includes(match.index)) {
            breakPoints.push(match.index);
          }
        }
        
        // Add sentence breaks (periods, question marks, exclamation points followed by space or newline)
        const sentenceRegex = /[.!?](\s|$)/g;
        while ((match = sentenceRegex.exec(text)) !== null) {
          if (!breakPoints.includes(match.index + 1)) {
            breakPoints.push(match.index + 1);
          }
        }
        
        // Sort breakpoints in ascending order
        breakPoints.sort((a, b) => a - b);
        
        return breakPoints;
      };
      
      // Create chunks based on natural break points while targeting a size
      const createSmartChunks = (text: string, targetSize: number, breakPoints: number[]): string[] => {
        const chunks: string[] = [];
        let startIndex = 0;
        
        // If no break points, fall back to character chunking
        if (breakPoints.length === 0) {
          for (let i = 0; i < text.length; i += targetSize) {
            chunks.push(text.substring(i, Math.min(i + targetSize, text.length)));
          }
          return chunks;
        }
        
        // Create chunks based on natural break points
        while (startIndex < text.length) {
          // Find best break point within target range
          let bestBreakPoint = -1;
          let closest = Number.MAX_VALUE;
          
          for (const breakPoint of breakPoints) {
            if (breakPoint > startIndex) {
              const chunkSize = breakPoint - startIndex;
              
              // Check if this break point is closer to our target size
              if (Math.abs(chunkSize - targetSize) < closest) {
                closest = Math.abs(chunkSize - targetSize);
                bestBreakPoint = breakPoint;
              }
              
              // If we're already past our target size, we can stop looking
              if (chunkSize > targetSize && bestBreakPoint !== -1) {
                break;
              }
            }
          }
          
          // If no suitable break point found, use target size or end of text
          if (bestBreakPoint === -1) {
            bestBreakPoint = Math.min(startIndex + targetSize, text.length);
          }
          
          // Add chunk
          chunks.push(text.substring(startIndex, bestBreakPoint));
          startIndex = bestBreakPoint;
        }
        
        return chunks;
      };
      
      // Balance chunks between two streams
      const balanceChunks = (chunks1: string[], chunks2: string[]): [string[], string[]] => {
        const maxChunks = Math.max(chunks1.length, chunks2.length);
        const balanced1: string[] = [];
        const balanced2: string[] = [];
        
        // If one stream has more chunks, we need to combine some chunks in the longer stream
        if (chunks1.length === chunks2.length) {
          return [chunks1, chunks2];
        }
        
        // Determine which stream has more chunks
        const [longer, shorter] = chunks1.length > chunks2.length 
          ? [chunks1, chunks2] 
          : [chunks2, chunks1];
        
        // Calculate how many chunks from the longer stream should go into each balanced chunk
        const ratio = longer.length / shorter.length;
        
        // Create balanced chunks
        for (let i = 0; i < shorter.length; i++) {
          const startIdx = Math.floor(i * ratio);
          const endIdx = Math.floor((i + 1) * ratio);
          
          // Combine multiple chunks from longer stream if needed
          const combinedChunk = longer.slice(startIdx, endIdx).join('');
          
          if (chunks1.length > chunks2.length) {
            balanced1.push(combinedChunk);
            balanced2.push(shorter[i]);
          } else {
            balanced1.push(shorter[i]);
            balanced2.push(combinedChunk);
          }
        }
        
        return [balanced1, balanced2];
      };
      
      // Find break points in both streams
      const breakPoints1 = findBreakPoints(stream1);
      const breakPoints2 = findBreakPoints(stream2);
      
      // Create initial chunks based on natural break points
      let stream1Chunks = createSmartChunks(stream1, targetChunkSize, breakPoints1);
      let stream2Chunks = createSmartChunks(stream2, targetChunkSize, breakPoints2);
      
      // Balance chunks between streams
      [stream1Chunks, stream2Chunks] = balanceChunks(stream1Chunks, stream2Chunks);
      
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
      const maxIndex = state.chunkedMessages.chunks.stream1.length - 1;
      
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