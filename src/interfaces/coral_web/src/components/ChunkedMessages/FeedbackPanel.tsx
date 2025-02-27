import React from 'react';
import { usechunkedMessagesStore } from '@/stores/persistedStore';

type FeedbackPanelProps = {
  streamId: 'stream1' | 'stream2';
};

const FeedbackPanel = ({ streamId }: FeedbackPanelProps) => {
  // Calculate position based on streamId
  const position = streamId === 'stream1' 
    ? 'left-0 right-1/2 pr-3' // Left half 
    : 'left-1/2 right-0 pl-3'; // Right half
  
  return (
    <div className={`absolute bottom-[60px] ${position} border-t border-marble-950 bg-marble-1000 px-4 py-3 z-9`}>
      <div className="text-sm font-medium text-marble-400">
        Feedback Summary for Response {streamId === 'stream1' ? '1' : '2'}
      </div>
      <div className="mt-2 text-sm">
        {/* Empty for now */}
      </div>
    </div>
  );
};

export default FeedbackPanel;