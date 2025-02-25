import { UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ApiError,
  CohereNetworkError,
  ConversationPublic,
  ConversationWithoutMessages,
  UpdateConversationRequest,
  useCohereClient,
} from '@/cohere-client';
import { DeleteConversations } from '@/components/Modals/DeleteConversations';
import { EditConversationTitle } from '@/components/Modals/EditConversationTitle';
import { STRINGS } from '@/constants/strings';
import { useContextStore } from '@/context';
import { useChatRoutes, useNavigateToNewChat } from '@/hooks/chatRoutes';
import { useNotify } from '@/hooks/toast';
import { useConversationStore } from '@/stores';
import { isAbortError } from '@/utils';
import { mapHistoryToMessages } from '@/utils/conversation';

export const useConversations = (params: { offset?: number; limit?: number; agentId?: string }) => {
  const client = useCohereClient();

  return useQuery<ConversationWithoutMessages[], ApiError>({
    queryKey: ['conversations', params.agentId],
    queryFn: async () => {
      const conversations = await client.listConversations(params);

      if (params.agentId) {
        return conversations;
      }

      return conversations;
    },
    retry: 0,
    refetchOnWindowFocus: false,
    initialData: [],
  });
};

export const useConversation = ({
  conversationId,
  disabledOnMount,
}: {
  conversationId?: string;
  disabledOnMount?: boolean;
}): UseQueryResult<ConversationPublic | undefined> => {
  const client = useCohereClient();
  const { setConversation } = useConversationStore();

  return useQuery<ConversationPublic | undefined, Error>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      try {
        if (!conversationId) throw new Error(STRINGS.conversationIDNotFoundError);
        const conversation = await client.getConversation({
          conversationId: conversationId,
        });
        console.log('[DEBUG] API returned conversation:', JSON.stringify(conversation, null, 2));
        
        // Process messages to handle parallel messages
        if (conversation.messages) {
          const processedMessages = mapHistoryToMessages(conversation.messages);
          
          // Update the conversation store with processed messages
          setConversation({
            id: conversation.id,
            name: conversation.title,
            messages: processedMessages
          });
        }
        
        return conversation;
      } catch (e) {
        if (!isAbortError(e)) {
          console.error(e);
          throw e;
        }
      }
    },
    retry: 0,
    refetchOnWindowFocus: false,
    enabled: !disabledOnMount && !!conversationId,
  });
};

export const useEditConversation = () => {
  const client = useCohereClient();
  const queryClient = useQueryClient();
  return useMutation<
    ConversationPublic,
    CohereNetworkError,
    { request: UpdateConversationRequest; conversationId: string }
  >({
    mutationFn: ({ request, conversationId }) => client.editConversation(request, conversationId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useDeleteConversation = () => {
  const client = useCohereClient();
  const queryClient = useQueryClient();
  return useMutation<unknown, CohereNetworkError, { conversationId: string }>({
    mutationFn: ({ conversationId }: { conversationId: string }) =>
      client.deleteConversation({ conversationId }),
    onSettled: (_, _err, { conversationId }: { conversationId: string }) => {
      queryClient.setQueriesData<ConversationPublic[]>(
        { queryKey: ['conversations'] },
        (oldConversations) => {
          return oldConversations?.filter((c) => c.id === conversationId);
        }
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useConversationActions = () => {
  const { agentId } = useChatRoutes();
  const { open, close } = useContextStore();
  const {
    conversation: { id: conversationId },
  } = useConversationStore();
  const notify = useNotify();
  const navigateToNewChat = useNavigateToNewChat();
  const { mutateAsync: deleteConversation, isPending } = useDeleteConversation();

  const handleDeleteConversation = async ({
    id,
    onComplete,
  }: {
    id: string;
    onComplete?: VoidFunction;
  }) => {
    const onDelete = () => {
      close();
      onComplete?.();

      if (id === conversationId) {
        navigateToNewChat(agentId);
      }
    };

    const onConfirm = async () => {
      try {
        await deleteConversation({ conversationId: id });
        onDelete();
      } catch (e) {
        console.error(e);
        notify.error(STRINGS.somethingWentWrong);
      }
    };

    open({
      title: STRINGS.deleteConversationConfirmation,
      content: (
        <DeleteConversations
          conversationIds={[id]}
          onClose={close}
          onConfirm={onConfirm}
          isPending={isPending}
        />
      ),
    });
  };

  const editConversationTitle = ({ id, title }: { id: string; title: string }) => {
    const onClose = () => {
      close();
    };

    open({
      title: STRINGS.editTitleTitle,
      content: (
        <EditConversationTitle
          conversationId={id}
          initialConversationTitle={title}
          onClose={onClose}
        />
      ),
    });
  };

  return { deleteConversation: handleDeleteConversation, editConversationTitle };
};
