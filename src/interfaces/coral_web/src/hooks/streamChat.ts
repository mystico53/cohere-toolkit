import { EventSourceMessage } from '@microsoft/fetch-event-source';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  ChatResponseEvent as ChatResponse,
  CohereChatRequest,
  CohereNetworkError,
  ConversationPublic,
  FinishReason,
  StreamEnd,
  StreamEvent,
  isUnauthorizedError,
  useCohereClient,
} from '@/cohere-client';
import { useExperimentalFeatures } from '@/hooks/experimentalFeatures';

interface StreamingParams {
  onRead: (data: ChatResponse) => void;
  onHeaders: (headers: Headers) => void;
  onFinish: () => void;
  onError: (error: unknown) => void;
}

export interface StreamingChatParams extends StreamingParams {
  request: CohereChatRequest;
  headers: Record<string, string>;
}

const getUpdatedConversations =
  (conversationId: string | undefined, description: string = '') =>
  (conversations: ConversationPublic[] | undefined) => {
    return conversations?.map((c) => {
      if (c.id !== conversationId) return c;

      return {
        ...c,
        description,
        updatedAt: new Date().toISOString(),
      };
    });
  };

export const useStreamChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const cohereClient = useCohereClient();
  const queryClient = useQueryClient();
  const { data: experimentalFeatures } = useExperimentalFeatures();

  useEffect(() => {
    return () => {
      console.log("[DEBUG][StreamChat] Cleanup: Aborting any active streams");
      abortControllerRef.current?.abort();
    };
  }, []);

  const retry = (failCount: number, error: CohereNetworkError) => {
    // we allow 1 retry for 401 errors
    console.log(`[DEBUG][StreamChat] Retry attempt ${failCount} for error:`, error);
    if (isUnauthorizedError(error)) {
      return failCount < 1;
    }
    return false;
  };

  const updateConversationHistory = (data?: StreamEnd) => {
    console.log("[DEBUG][StreamChat] Updating conversation history with data:", data);
    if (!data) return;

    queryClient.setQueryData<ConversationPublic[]>(
      ['conversations'],
      getUpdatedConversations(data?.conversation_id ?? '', data?.text)
    );
  };

  const chatMutation = useMutation<StreamEnd | undefined, CohereNetworkError, StreamingChatParams>({
    mutationFn: async (params: StreamingChatParams) => {
      try {
        console.log("[DEBUG][StreamChat] Starting mutation with params:", {
          message: params.request.message,
          conversation_id: params.request.conversation_id,
          headers: params.headers
        });

        queryClient.setQueryData<ConversationPublic[]>(
          ['conversations'],
          getUpdatedConversations(params.request.conversation_id ?? '', params.request.message)
        );

        abortControllerRef.current = new AbortController();

        const { request, headers, onRead, onError, onFinish } = params;

        const chatStreamParams = {
          request: {
            message: request.message,
            preamble: request.preamble,
            temperature: request.temperature,
            conversation_id: request.conversation_id,
            tools: request.tools
          },
          headers,
          signal: abortControllerRef.current.signal,
          onMessage: (event: EventSourceMessage) => {
            try {
              console.log("[DEBUG][StreamChat] Raw event received:", event);
              if (!event.data) {
                console.log("[DEBUG][StreamChat] Event has no data, skipping");
                return;
              }
              
              const data = JSON.parse(event.data);
              console.log("[DEBUG][StreamChat] Parsed event data:", data);

              if (data?.event === StreamEvent.STREAM_END) {
                console.log("[DEBUG][StreamChat] Stream end event received:", data);
                const streamEndData = data.data as StreamEnd;

                if (streamEndData.finish_reason !== FinishReason.COMPLETE) {
                  console.error("[DEBUG][StreamChat] Stream ended with error:", streamEndData.error);
                  throw new Error(streamEndData.error || 'Stream ended unexpectedly');
                }

                if (params.request.conversation_id) {
                  console.log("[DEBUG][StreamChat] Updating conversation with final text:", streamEndData.text);
                  queryClient.setQueryData<ConversationPublic[]>(
                    ['conversations'],
                    getUpdatedConversations(params.request.conversation_id, streamEndData.text)
                  );
                }
              }
              
              console.log("[DEBUG][StreamChat] Calling onRead with data");
              onRead(data);
            } catch (e) {
              console.error("[DEBUG][StreamChat] Error processing event:", e);
              const errMsg = e instanceof Error ? e.message : 'unable to parse event data';
              throw new Error(errMsg);
            }
          },
          onError: (err: unknown) => {
            console.error("[DEBUG][StreamChat] Stream error:", err);
            onError(err);
            // Rethrow to stop the operation
            throw err;
          },
          onClose: () => {
            console.log("[DEBUG][StreamChat] Stream closed");
            onFinish();
          },
        };
        
        console.log("[DEBUG][StreamChat] Calling cohereClient.chat with params:", chatStreamParams);
        await cohereClient.chat({ ...chatStreamParams });
        console.log("[DEBUG][StreamChat] cohereClient.chat completed successfully");
      } catch (e) {
        console.error("[DEBUG][StreamChat] Caught error in mutation:", e);
        if (isUnauthorizedError(e)) {
          console.log("[DEBUG][StreamChat] Unauthorized error, invalidating API key query");
          await queryClient.invalidateQueries({ queryKey: ['defaultAPIKey'] });
        }
        return Promise.reject(e);
      }
    },
    retry,
    onSuccess: updateConversationHistory,
  });

  return {
    chatMutation,
    abortController: abortControllerRef,
  };
};