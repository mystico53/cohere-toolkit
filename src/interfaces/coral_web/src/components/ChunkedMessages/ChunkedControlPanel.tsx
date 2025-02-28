import React from 'react';
import { cn } from '@/utils';
import StreamLoadingIndicator from '../ChunkedMessagesStreamIndicator';

type ChunkedControlPanelProps = {
  progress: number;
  hasMoreChunks: boolean;
  onNextChunk: () => void;
  onStartOver: () => void;
};

const ChunkedControlPanel = ({
  progress,
  hasMoreChunks,
  onNextChunk,
  onStartOver,
}: ChunkedControlPanelProps) => {
  return (
    <div className="absolute top-0 left-0 right-0 border-b border-marble-950 bg-marble-1000 px-4 py-3 z-10 shadow-lg">
      {/* Progress bar and controls in the same row */}
      <div className="flex items-center justify-between">
        <div className="flex-grow mr-4 bg-marble-900 h-3 rounded-full relative">
          <div 
            className="rounded-full transition-all duration-500 ease-out h-full" 
            style={{ width: `${progress}%`, backgroundColor: '#FF8266' }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <StreamLoadingIndicator />
          <button 
            onClick={onStartOver}
            className="px-3 py-1 rounded-md text-sm bg-marble-800 text-marble-500"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChunkedControlPanel;