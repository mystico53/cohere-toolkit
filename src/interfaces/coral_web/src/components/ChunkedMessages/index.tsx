'use client';

// Import all components directly - avoid importing the default export
import { default as ChunkedComponent } from './ChunkedMessagesComponent';
import { default as MessageStreamColumn } from './MessageStreamColumn';
import { default as ChunkedControlPanel } from './ChunkedControlPanel';
import { default as FeedbackPanel } from './FeedbackPanel';

// Export all types from the centralized types file
export * from './types';

// Export sub-components as named exports
export {
  MessageStreamColumn,
  ChunkedControlPanel,
  FeedbackPanel
};

// Export the main component as default
export default ChunkedComponent;