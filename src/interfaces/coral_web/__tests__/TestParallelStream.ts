import React from 'react';
import { useParallelStreamChat } from './parallelStreamChat';
import { StreamEvent } from '@/cohere-client';

const TestParallelStream = () => {
  const { parallelChatMutation } = useParallelStreamChat();

  const testStream = async () => {
    console.log('Starting parallel stream test...');

    await parallelChatMutation.mutateAsync({
      request: {
        message: "Test parallel streams",
        // Add other required params
      },
      headers: {
        // Add needed headers
      },
      onMessage1: (data) => {
        if (data.event === StreamEvent.TEXT_GENERATION) {
          console.log('Stream 1:', data);
        }
      },
      onMessage2: (data) => {
        if (data.event === StreamEvent.TEXT_GENERATION) {
          console.log('Stream 2:', data);
        }
      },
      onError: (error) => {
        console.error('Stream error:', error);
      },
      onFinish: () => {
        console.log('Streams finished');
      }
    });
  };

  return (
    <div>
      <button 
        onClick={testStream}
        className="p-2 bg-blue-500 text-white rounded"
      >
        Test Parallel Stream
      </button>
    </div>
  );
};

export default TestParallelStream;