// src/stores/slices/feedbackTestingSlice.ts

import { StateCreator } from 'zustand';
import { StoreState } from '..';

// Store the complete text and all feedback data
type FeedbackTestingState = {
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
  isTestingMode: boolean;
};

// Define actions for the slice
type FeedbackTestingActions = {
  startFeedbackSession: () => void;
  updateStreamContent: (streamId: 'stream1' | 'stream2', content: string) => void;
  completeStreams: () => void;
  createChunks: (numChunks?: number) => void;
  recordFeedback: (streamId: 'stream1' | 'stream2', feedback: { rating?: 'positive' | 'negative'; comment?: string }) => void;
  showNextChunk: () => void;
  resetFeedbackSession: () => void;
};

export type FeedbackTestingStore = {
  feedbackTesting: FeedbackTestingState;
} & FeedbackTestingActions;

// Initial state
const INITIAL_STATE: FeedbackTestingState = {
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
  isTestingMode: false,
};

export const createFeedbackTestingSlice: StateCreator<StoreState, [], [], FeedbackTestingStore> = (set, get) => ({
  feedbackTesting: INITIAL_STATE,
  
  startFeedbackSession: () => {
    set({
      feedbackTesting: {
        ...INITIAL_STATE,
        isTestingMode: true,
      }
    });
  },
  
  updateStreamContent: (streamId, content) => {
    set((state) => ({
      feedbackTesting: {
        ...state.feedbackTesting,
        responses: {
          ...state.feedbackTesting.responses,
          [streamId]: content,
        }
      }
    }));
  },
  
  completeStreams: () => {
    set((state) => ({
      feedbackTesting: {
        ...state.feedbackTesting,
        isComplete: true,
      }
    }));
    
    // Once complete, automatically create chunks
    get().createChunks();
  },
  
  createChunks: (numChunks = 5) => {
    set((state) => {
      const { stream1, stream2 } = state.feedbackTesting.responses;
      
      // Divide text into chunks by percentage
      const createTextChunks = (text: string, count: number) => {
        const chunks: string[] = [];
        const chunkSize = Math.ceil(text.length / count);
        
        for (let i = 0; i < count; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, text.length);
          chunks.push(text.substring(start, end));
        }
        console.log('Created chunks:', {
            stream1: state.feedbackTesting.chunks.stream1.map(c => c.length),
            stream2: state.feedbackTesting.chunks.stream2.map(c => c.length),
          });
        return chunks;
      };
      
      // Create empty feedback slots for each chunk
      const createEmptyFeedback = (count: number) => {
        return Array(count).fill(null).map(() => ({}));
      };
      
      const stream1Chunks = createTextChunks(stream1, numChunks);
      const stream2Chunks = createTextChunks(stream2, numChunks);
      
      return {
        feedbackTesting: {
          ...state.feedbackTesting,
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
      const currentIndex = state.feedbackTesting.currentChunkIndex;
      const updatedFeedback = {
        ...state.feedbackTesting.feedback,
        [streamId]: [
          ...state.feedbackTesting.feedback[streamId].slice(0, currentIndex),
          chunkFeedback,
          ...state.feedbackTesting.feedback[streamId].slice(currentIndex + 1)
        ]
      };
      
      return {
        feedbackTesting: {
          ...state.feedbackTesting,
          feedback: updatedFeedback
        }
      };
    });
  },
  
  showNextChunk: () => {
    set((state) => {
      const nextIndex = state.feedbackTesting.currentChunkIndex + 1;
      const maxIndex = state.feedbackTesting.chunks.stream1.length - 1;
      
      return {
        feedbackTesting: {
          ...state.feedbackTesting,
          currentChunkIndex: Math.min(nextIndex, maxIndex)
        }
      };
    });
  },
  
  resetFeedbackSession: () => {
    set({
      feedbackTesting: INITIAL_STATE
    });
  }
});