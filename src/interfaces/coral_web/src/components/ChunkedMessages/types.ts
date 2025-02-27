// Centralized type definitions for ChunkedMessages components

export type ChunkedFeedback = {
    rating?: 'positive' | 'negative';
    comment?: string;
    selectedText?: string;
    timestamp?: number;
  };
  
  export type ChunkedMessagesProps = {
    agentId: string; 
    onRetry: () => void;
    isStreaming?: boolean;
    isStreamingToolEvents?: boolean;
    messages?: any[];
    streamingMessage?: any;
    streamingMessage1?: any;
    streamingMessage2?: any;
  };
  
  export type MessageStreamColumnProps = {
    streamId: 'stream1' | 'stream2';
    chunks: any[];
    currentIndex: number;
    onChunkClick: () => void;
    onFeedbackSelect: (rating: 'positive' | 'negative') => void;
    onTextSelect: (text: string) => void;
  };
  
  export type ChunkedControlPanelProps = {
    progress: number;
    selectedText?: string;
    feedbackComment: string;
    hasMoreChunks: boolean;
    onNextChunk: () => void;
    onStartOver: () => void;
    onFeedbackCommentChange: (comment: string) => void;
    onSubmitFeedback: () => void;
  };