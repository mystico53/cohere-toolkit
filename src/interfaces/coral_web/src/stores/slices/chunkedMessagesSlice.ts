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
  
  createChunks: (maxChunkSize = 800) => {
    set((state) => {
      const { stream1, stream2 } = state.chunkedMessages.responses;
      
      // Simple function to chunk text into segments of exactly maxChunkSize
      const createTextChunks = (text: string): string[] => {
        const chunks: string[] = [];
        
        // If text is empty, return empty array
        if (!text) return chunks;
        
        // Simply split text into chunks of maxChunkSize characters
        for (let i = 0; i < text.length; i += maxChunkSize) {
          const chunk = text.substring(i, Math.min(i + maxChunkSize, text.length));
          
          // Add ellipsis if this isn't the last chunk and we're not at the end of the text
          if (i + maxChunkSize < text.length) {
            chunks.push(chunk + '...');
          } else {
            chunks.push(chunk);
          }
        }
        
        return chunks;
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