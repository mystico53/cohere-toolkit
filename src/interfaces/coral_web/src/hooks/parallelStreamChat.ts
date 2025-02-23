// src/hooks/parallelStreamChat.ts

import { EventSourceMessage } from '@microsoft/fetch-event-source';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  ChatResponseEvent,
  CohereChatRequest,
  CohereNetworkError,
  StreamEnd,
  StreamEvent,
  isUnauthorizedError,
  useCohereClient,
} from '@/cohere-client';

interface ParallelStreamingParams {
  request: CohereChatRequest;
  headers: Record<string, string>;
  onMessage1: (data: ChatResponseEvent) => void;
  onMessage2: (data: ChatResponseEvent) => void;
  onFinish: () => void;
  onError: (error: unknown) => void;
}

export const useParallelStreamChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const cohereClient = useCohereClient();

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const retry = (failCount: number, error: CohereNetworkError) => {
    // Same retry logic as useStreamChat
    if (isUnauthorizedError(error)) {
      return failCount < 1;
    }
    return false;
  };

  const parallelChatMutation = useMutation<StreamEnd | undefined, CohereNetworkError, ParallelStreamingParams>({
    mutationFn: async (params: ParallelStreamingParams) => {
      try {
        abortControllerRef.current = new AbortController();

        const { request, headers, onMessage1, onMessage2, onError, onFinish } = params;

        await cohereClient.chatParallelFeedback({
          request,
          headers,
          signal: abortControllerRef.current.signal,
          onMessage1: (event: EventSourceMessage) => {
            try {
              if (!event.data) return;
              const data = JSON.parse(event.data);
              onMessage1(data);
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : 'unable to parse event data';
              onError(new Error(errMsg));
            }
          },
          onMessage2: (event: EventSourceMessage) => {
            try {
              if (!event.data) return;
              const data = JSON.parse(event.data);
              onMessage2(data);
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : 'unable to parse event data';
              onError(new Error(errMsg));
            }
          },
          onError1: onError,
          onError2: onError,
          onFinish
        });
      } catch (e) {
        if (isUnauthorizedError(e)) {
          // Handle unauthorized error if needed
          console.error('Unauthorized error in parallel stream');
        }
        return Promise.reject(e);
      }
    },
    retry
  });

  return {
    parallelChatMutation,
    abortController: abortControllerRef,
  };
};