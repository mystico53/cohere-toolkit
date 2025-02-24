import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  ChatResponseEvent,
  CohereChatRequest,
  CohereNetworkError,
  ConversationPublic,
  FinishReason,
  StreamEnd,
  StreamEvent,
  isUnauthorizedError,
  useCohereClient,
} from '@/cohere-client';

const debug = {
  log: (context: string, message: string, data?: any) => {
    console.log(`[ParallelStream:${context}]`, message, data || '');
  },
  error: (context: string, error: unknown) => {
    console.error(`[ParallelStream:${context}] Error:`, error);
  }
};

interface ParallelStreamingParams {
  request: CohereChatRequest;
  headers: Record<string, string>;
  onMessage1: (data: ChatResponseEvent) => void;
  onMessage2: (data: ChatResponseEvent) => void;
  onFinish: () => void;
  onError: (error: unknown) => void;
}

const getUpdatedConversations = (
  conversationId: string | undefined, 
  description: string = ''
) => (
  conversations: ConversationPublic[] | undefined
) => {
  return conversations?.map((c) => {
    if (c.id !== conversationId) return c;
    return {
      ...c,
      description,
      updatedAt: new Date().toISOString(),
    };
  });
};

export const useParallelStreamChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const cohereClient = useCohereClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        debug.log('cleanup', 'Aborting existing connection');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const retry = (failCount: number, error: CohereNetworkError) => {
    debug.log('retry', `Attempt ${failCount}`, { error });
    if (isUnauthorizedError(error)) {
      return failCount < 1;
    }
    return false;
  };

  const updateConversationHistory = (data?: StreamEnd) => {
    if (!data?.conversation_id) return;
    queryClient.setQueryData<ConversationPublic[]>(
      ['conversations'],
      getUpdatedConversations(data.conversation_id, data.text)
    );
  };

  const parallelChatMutation = useMutation<StreamEnd | undefined, CohereNetworkError, ParallelStreamingParams>({
    mutationFn: async (params: ParallelStreamingParams) => {
      try {
        debug.log('mutation', 'Starting parallel chat streams', { request: params.request });
        
        // Optimistic update
        if (params.request.conversation_id) {
          queryClient.setQueryData<ConversationPublic[]>(
            ['conversations'],
            getUpdatedConversations(params.request.conversation_id, params.request.message)
          );
        }

        abortControllerRef.current = new AbortController();

        const { request, headers, onMessage1, onMessage2, onError, onFinish } = params;

        await cohereClient.chatParallelFeedback({
          request,
          headers,
          signal: abortControllerRef.current.signal,
          onMessage1: (data: ChatResponseEvent) => {
            try {
              debug.log('stream1', 'Received message', data);
              
              // The data is already a ChatResponseEvent object, so we can use it directly
              if (data?.event === StreamEvent.STREAM_END) {
                const streamEndData = data.data as StreamEnd;
                if (streamEndData.finish_reason !== FinishReason.COMPLETE) {
                  throw new Error(streamEndData.error || 'Stream 1 ended unexpectedly');
                }
              }
              
              onMessage1(data);
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : 'unable to process event data';
              debug.error('stream1', e);
              onError(new Error(errMsg));
            }
          },
          onMessage2: (data: ChatResponseEvent) => {
            try {
              debug.log('stream2', 'Received message', data);
              
              // The data is already a ChatResponseEvent object, so we can use it directly
              if (data?.event === StreamEvent.STREAM_END) {
                const streamEndData = data.data as StreamEnd;
                if (streamEndData.finish_reason !== FinishReason.COMPLETE) {
                  throw new Error(streamEndData.error || 'Stream 2 ended unexpectedly');
                }
              }
              
              onMessage2(data);
            } catch (e) {
              const errMsg = e instanceof Error ? e.message : 'unable to process event data';
              debug.error('stream2', e);
              onError(new Error(errMsg));
            }
          },
          onError1: (error) => {
            debug.error('stream1', error);
            onError(error);
          },
          onError2: (error) => {
            debug.error('stream2', error);
            onError(error);
          },
          onFinish: () => {
            debug.log('streams', 'Both streams finished');
            onFinish();
          }
        });
      } catch (e) {
        if (isUnauthorizedError(e)) {
          debug.error('auth', 'Unauthorized error in parallel stream');
          await queryClient.invalidateQueries({ queryKey: ['defaultAPIKey'] });
        }
        return Promise.reject(e);
      }
    },
    retry,
    onSuccess: updateConversationHistory
  });

  return {
    parallelChatMutation,
    abortController: abortControllerRef,
  };
};