'use client';

// This file exists to maintain backward compatibility with existing imports
// It re-exports everything from the modular directory structure

// Import all components and types from the index file
import ChunkedMessagesMain, {
  MessageStreamColumn,
  ChunkedControlPanel,
  //FeedbackPanel
} from './ChunkedMessages/index';

// Re-export all the types
export * from './ChunkedMessages/types';

// Re-export the component exports
export {
  MessageStreamColumn,
  ChunkedControlPanel,
  //FeedbackPanel
};

// Export the main component as default
export default ChunkedMessagesMain;