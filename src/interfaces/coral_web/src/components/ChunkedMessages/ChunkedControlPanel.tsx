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
    <div className="absolute bottom-0 left-0 right-0 border-t border-marble-950 bg-marble-1000 px-4 py-3 z-10 shadow-lg flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-marble-900 h-1 rounded-full mb-3">
        <div 
          className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Controls and feedback section */}
      <div className="flex flex-col gap-2">
        {/* Top row: Navigation controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-lg font-medium">Message Chunks</div>
            <StreamLoadingIndicator />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onNextChunk}
              disabled={!hasMoreChunks}
              className={cn(
                "px-3 py-1 rounded-md text-sm",
                !hasMoreChunks
                  ? "bg-marble-800 text-marble-500 cursor-not-allowed" 
                  : "bg-marble-800 hover:bg-marble-700 text-white"
              )}
            >
              Next Both
            </button>
            <button 
              onClick={onStartOver}
              className="px-3 py-1 rounded-md text-sm bg-red-800 hover:bg-red-700 text-white"
            >
              Start Over
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ChunkedControlPanel;