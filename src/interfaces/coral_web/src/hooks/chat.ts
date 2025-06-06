import { UseMutateAsyncFunction, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParallelStreamChat } from './parallelStreamChat';
import { usePersistedStore } from '@/stores/persistedStore';

import {
  ChatResponseEvent,
  Citation,
  CohereChatRequest,
  CohereNetworkError,
  Document,
  FinishReason,
  StreamCitationGeneration,
  StreamEnd,
  StreamEvent,
  StreamSearchResults,
  StreamStart,
  StreamTextGeneration,
  StreamToolCallsChunk,
  StreamToolCallsGeneration,
  isCohereNetworkError,
  isStreamError,
} from '@/cohere-client';
import {
  DEFAULT_TYPING_VELOCITY,
  DEPLOYMENT_COHERE_PLATFORM,
  TOOL_PYTHON_INTERPRETER_ID,
} from '@/constants';
import { STRINGS } from '@/constants/strings';
import { useChatRoutes } from '@/hooks/chatRoutes';
import { useUpdateConversationTitle } from '@/hooks/generateTitle';
import { StreamingChatParams, useStreamChat } from '@/hooks/streamChat';
import { useCitationsStore, useConversationStore, useFilesStore, useParamsStore, useSettingsStore } from '@/stores';
import { OutputFiles } from '@/stores/slices/citationsSlice';
import {
  BotState,
  ChatMessage,
  ErrorMessage,
  FulfilledMessage,
  MessageType,
  StreamingMessage,
  createAbortedMessage,
  createErrorMessage,
  createLoadingMessage,
} from '@/types/message';
import {
  createStartEndKey,
  fixMarkdownImagesInText,
  isGroundingOn,
  replaceTextWithCitations,
  shouldUpdateConversationTitle,
} from '@/utils';
import { replaceCodeBlockWithIframe } from '@/utils/preview';
import { parsePythonInterpreterToolFields } from '@/utils/tools';

const USER_ERROR_MESSAGE = `${STRINGS.networkError} `;
const ABORT_REASON_USER = 'USER_ABORTED';

type IdToDocument = { [documentId: string]: Document };

type ChatRequestOverrides = Pick<
  CohereChatRequest,
  'temperature' | 'model' | 'preamble' | 'tools' | 'file_ids'
>;

interface ExtendedChatRequest extends CohereChatRequest {
  humanFeedback?: boolean;
}

export type HandleSendChat = (
  {
    currentMessages,
    suggestedMessage,
  }: {
    currentMessages?: ChatMessage[];
    suggestedMessage?: string;
  },
  overrides?: ChatRequestOverrides,
  regenerating?: boolean
) => Promise<void>;

export const useChat = (config?: { onSend?: (msg: string) => void }) => {
  const { chatMutation, abortController } = useStreamChat();
  const { parallelChatMutation, abortController: parallelAbortController } = useParallelStreamChat();
  const { mutateAsync: streamChat } = chatMutation;

  const [streamingMessage1, setStreamingMessage1] = useState<StreamingMessage | null>(null);
  const [streamingMessage2, setStreamingMessage2] = useState<StreamingMessage | null>(null);
  const [isParallelStreaming, setIsParallelStreaming] = useState(false);

  const {
    params: { temperature, preamble, tools, model, deployment, deploymentConfig, fileIds },
  } = useParamsStore();

  const {
    conversation: { id, messages },
    setConversation,
    setPendingMessage,
  } = useConversationStore();
  const { mutateAsync: updateConversationTitle } = useUpdateConversationTitle();
  const {
    citations: { outputFiles: savedOutputFiles },
    addSearchResults,
    addCitation,
    saveOutputFiles,
  } = useCitationsStore();
  const {
    files: { composerFiles },
    clearComposerFiles,
    clearUploadingErrors,
  } = useFilesStore();
  const queryClient = useQueryClient();

  const [userMessage, setUserMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStreamingToolEvents, setIsStreamingToolEvents] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const { agentId } = useChatRoutes();

  useEffect(() => {
    return () => {
      abortController.current?.abort();
      setStreamingMessage(null);
    };
  }, []);

  const saveCitations = (
    generationId: string,
    citations: Citation[],
    documentsMap: {
      [documentId: string]: Document;
    }
  ) => {
    for (const citation of citations) {
      const startEndKey = createStartEndKey(citation.start ?? 0, citation.end ?? 0);
      const documents = (citation?.document_ids || [])
        .map((id) => documentsMap[id])
        // When we use documents for RAG, we don't get the documents split up by snippet
        // and their new ids until the final response. In the future, we will potentially
        // get the snippets in the citation-generation event and we can inject them here.
        .filter(Boolean);
      addCitation(generationId, startEndKey, documents);
    }
  };

  const mapDocuments = (documents: Document[]) => {
    return documents.reduce<{ documentsMap: IdToDocument; outputFilesMap: OutputFiles }>(
      ({ documentsMap, outputFilesMap }, doc) => {
        const docId = doc?.document_id ?? '';
        const toolName = doc?.tool_name ?? '';
        const newOutputFilesMapEntry: OutputFiles = {};

        if (toolName === TOOL_PYTHON_INTERPRETER_ID) {
          const { outputFile } = parsePythonInterpreterToolFields(doc);

          if (outputFile) {
            newOutputFilesMapEntry[outputFile.filename] = {
              name: outputFile.filename,
              data: outputFile.b64_data,
              documentId: docId,
            };
          }
        }
        return {
          documentsMap: { ...documentsMap, [docId]: doc },
          outputFilesMap: { ...outputFilesMap, ...newOutputFilesMapEntry },
        };
      },
      { documentsMap: {}, outputFilesMap: {} }
    );
  };

  const mapOutputFiles = (outputFiles: { output_file: string; text: string }[] | undefined) => {
    return outputFiles?.reduce<OutputFiles>((outputFilesMap, outputFile) => {
      try {
        const outputFileObj: { filename: string; b64_data: string } = JSON.parse(
          outputFile.output_file
        );
        return {
          ...outputFilesMap,
          [outputFileObj.filename]: {
            name: outputFileObj.filename,
            data: outputFileObj.b64_data,
          },
        };
      } catch (e) {
        console.error('Could not parse output_file', e);
      }
      return outputFilesMap;
    }, {});
  };

  const handleUpdateConversationTitle = async (conversationId: string) => {
    const { title } = await updateConversationTitle(conversationId);

    if (!title) return;

    // wait for the side panel to add the new conversation with the animation included
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // iterate each character in the title and add a delay to simulate typing
    for (let i = 0; i < title.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_TYPING_VELOCITY));
      // only update the conversation name if the user is still on the same conversation
      // usage of window.location instead of router is due of replacing the url through
      // window.history in ConversationsContext.
      if (window?.location.pathname.includes(conversationId)) {
        setConversation({ name: title.slice(0, i + 1) });
      }
    }
  };

  const handleStreamConverse = async ({
    newMessages,
    request,
    headers,
    streamConverse,
  }: {
    newMessages: ChatMessage[];
    request: CohereChatRequest;
    headers: Record<string, string>;
    streamConverse: UseMutateAsyncFunction<
      StreamEnd | undefined,
      CohereNetworkError,
      StreamingChatParams,
      unknown
    >;
  }) => {
    setConversation({ messages: newMessages });
    const isRAGOn = isGroundingOn(request?.tools || [], request.file_ids || []);
    setStreamingMessage(
      createLoadingMessage({
        text: '',
        isRAGOn,
      })
    );

    let botResponse = '';
    let conversationId = '';
    let generationId = '';
    let citations: Citation[] = [];
    let documentsMap: IdToDocument = {};
    let outputFiles: OutputFiles = {};
    let toolEvents: StreamToolCallsGeneration[] = [];
    let currentToolEventIndex = 0;

    // Temporarily store the streaming `parameters` partial JSON string for a tool call
    let toolCallParamaterStr = '';

    clearComposerFiles();
    clearUploadingErrors();

    await streamConverse({
      request,
      headers,
      onRead: (eventData: ChatResponseEvent) => {
        switch (eventData.event) {
          case StreamEvent.STREAM_START: {
            const data = eventData.data as StreamStart;
            setIsStreaming(true);
            conversationId = data?.conversation_id ?? '';
            generationId = data?.generation_id ?? '';
            break;
          }

          case StreamEvent.TEXT_GENERATION: {
            setIsStreamingToolEvents(false);
            const data = eventData.data as StreamTextGeneration;
            botResponse += data?.text ?? '';
            setStreamingMessage({
              type: MessageType.BOT,
              state: BotState.TYPING,
              text: botResponse,
              generationId,
              isRAGOn,
              originalText: botResponse,
              toolEvents,
            });
            break;
          }

          // This event only occurs when we use tools.
          case StreamEvent.SEARCH_RESULTS: {
            const data = eventData.data as StreamSearchResults;
            const documents = data?.documents ?? [];

            const { documentsMap: newDocumentsMap, outputFilesMap: newOutputFilesMap } =
              mapDocuments(documents);
            documentsMap = { ...documentsMap, ...newDocumentsMap };
            outputFiles = { ...outputFiles, ...newOutputFilesMap };
            // we are only interested in web_search results
            // ignore search results of pyhton interpreter tool
            if (
              toolEvents[currentToolEventIndex - 1]?.tool_calls?.[0]?.name !==
              TOOL_PYTHON_INTERPRETER_ID
            ) {
              toolEvents.push({
                text: '',
                stream_search_results: data,
                tool_calls: [],
              } as StreamToolCallsGeneration);
              currentToolEventIndex += 1;
            }
            break;
          }

          case StreamEvent.TOOL_CALLS_CHUNK: {
            setIsStreamingToolEvents(true);
            const data = eventData.data as StreamToolCallsChunk;

            // Initiate an empty tool event if one doesn't already exist at the current index
            const toolEvent: StreamToolCallsGeneration = toolEvents[currentToolEventIndex] ?? {
              text: '',
              tool_calls: [],
            };
            toolEvent.text += data?.text ?? '';

            // A tool call needs to be added/updated if a tool call delta is present in the event
            if (data?.tool_call_delta) {
              const currentToolCallsIndex = data.tool_call_delta.index ?? 0;
              let toolCall = toolEvent.tool_calls?.[currentToolCallsIndex];
              if (!toolCall) {
                toolCall = {
                  name: '',
                  parameters: {},
                };
                toolCallParamaterStr = '';
              }

              if (data?.tool_call_delta?.name) {
                toolCall.name = data.tool_call_delta.name;
              }
              if (data?.tool_call_delta?.parameters) {
                toolCallParamaterStr += data?.tool_call_delta?.parameters;

                // Attempt to parse the partial parameter string as valid JSON to show that the parameters
                // are streaming in. To make the partial JSON string valid JSON after the object key comes in,
                // we naively try to add `"}` to the end.
                try {
                  const partialParams = JSON.parse(toolCallParamaterStr + `"}`);
                  toolCall.parameters = partialParams;
                } catch (e) {
                  // Ignore parsing error
                }
              }

              // Update the tool call list with the new/updated tool call
              if (toolEvent.tool_calls?.[currentToolCallsIndex]) {
                toolEvent.tool_calls[currentToolCallsIndex] = toolCall;
              } else {
                toolEvent.tool_calls?.push(toolCall);
              }
            }

            // Update the tool event list with the new/updated tool event
            if (toolEvents[currentToolEventIndex]) {
              toolEvents[currentToolEventIndex] = toolEvent;
            } else {
              toolEvents.push(toolEvent);
            }

            setStreamingMessage({
              type: MessageType.BOT,
              state: BotState.TYPING,
              text: botResponse,
              isRAGOn,
              generationId,
              originalText: botResponse,
              toolEvents,
            });
            break;
          }

          case StreamEvent.TOOL_CALLS_GENERATION: {
            const data = eventData.data as StreamToolCallsGeneration;

            if (toolEvents[currentToolEventIndex]) {
              toolEvents[currentToolEventIndex] = data;
              currentToolEventIndex += 1;
            } else {
              toolEvents.push(data);
              currentToolEventIndex = toolEvents.length; // double check this is right
            }
            break;
          }

          case StreamEvent.CITATION_GENERATION: {
            const data = eventData.data as StreamCitationGeneration;
            const newCitations = [...(data?.citations ?? [])];
            newCitations.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
            citations.push(...newCitations);
            citations.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
            saveCitations(generationId, newCitations, documentsMap);

            setStreamingMessage({
              type: MessageType.BOT,
              state: BotState.TYPING,
              text: replaceTextWithCitations(botResponse, citations, generationId),
              citations,
              isRAGOn,
              generationId,
              originalText: botResponse,
              toolEvents,
            });
            break;
          }

          case StreamEvent.STREAM_END: {
            const data = eventData.data as StreamEnd;

            conversationId = data?.conversation_id ?? '';

            if (id !== conversationId) {
              setConversation({ id: conversationId });
            }
            // Make sure our URL is up to date with the conversationId
            if (!window.location.pathname.includes(`c/${conversationId}`) && conversationId) {
              const newUrl =
                window.location.pathname === '/'
                  ? `c/${conversationId}`
                  : window.location.pathname + `/c/${conversationId}`;
              window?.history?.replaceState(null, '', newUrl);
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
            }

            const responseText = data.text ?? '';

            addSearchResults(data?.search_results ?? []);

            // When we use documents for RAG, we don't get the documents split up by snippet
            // and their new ids until the final response. In the future, we will potentially
            // get the snippets in the citation-generation event and we can inject them there.
            const { documentsMap: newDocumentsMap, outputFilesMap: newOutputFilesMap } =
              mapDocuments(data.documents ?? []);
            documentsMap = { ...documentsMap, ...newDocumentsMap };
            outputFiles = { ...outputFiles, ...newOutputFilesMap };

            saveCitations(generationId, citations, documentsMap);
            saveOutputFiles({ ...savedOutputFiles, ...outputFiles });

            const outputText =
              data?.finish_reason === FinishReason.MAX_TOKENS ? botResponse : responseText;

            // Replace HTML code blocks with iframes
            const transformedText = replaceCodeBlockWithIframe(outputText);

            const finalText = isRAGOn
              ? replaceTextWithCitations(
                  // TODO(@wujessica): temporarily use the text generated from the stream when MAX_TOKENS
                  // because the final response doesn't give us the full text yet. Note - this means that
                  // citations will only appear for the first 'block' of text generated.
                  transformedText,
                  citations,
                  generationId
                )
              : botResponse;

            const finalMessage: FulfilledMessage = {
              type: MessageType.BOT,
              state: BotState.FULFILLED,
              generationId,
              text: citations.length > 0 ? finalText : fixMarkdownImagesInText(transformedText),
              citations,
              isRAGOn,
              originalText: isRAGOn ? responseText : botResponse,
              toolEvents,
            };

            setConversation({ messages: [...newMessages, finalMessage] });
            setStreamingMessage(null);

            if (shouldUpdateConversationTitle(newMessages)) {
              handleUpdateConversationTitle(conversationId);
            }

            break;
          }
        }
      },
      onHeaders: () => {},
      onFinish: () => {
        setIsStreaming(false);
      },
      onError: (e) => {
        citations = [];
        if (isCohereNetworkError(e)) {
          const networkError = e;
          let errorMessage = networkError.message ?? USER_ERROR_MESSAGE;

          setConversation({
            messages: newMessages.map((m, i) =>
              i < newMessages.length - 1
                ? m
                : { ...m, error: `[${networkError.status}] ${errorMessage}` }
            ),
          });
        } else if (isStreamError(e)) {
          const streamError = e;

          const lastMessage: ErrorMessage = createErrorMessage({
            text: botResponse,
            error: `[${streamError.code}] ${USER_ERROR_MESSAGE}`,
          });

          setConversation({ messages: [...newMessages, lastMessage] });
        } else {
          let error = (e as CohereNetworkError)?.message || STRINGS.generationError;

          if (error === 'network error' && deployment === DEPLOYMENT_COHERE_PLATFORM) {
            error += ` (${STRINGS.networkErrorSuggestion})`;
          }
          setConversation({
            messages: [
              ...newMessages,
              createErrorMessage({
                text: botResponse,
                error,
              }),
            ],
          });
        }
        setIsStreaming(false);
        setStreamingMessage(null);
        setPendingMessage(null);
      },
    });
  };
  
  // Update the function signatures to use the extended type
  const getChatRequest = (message: string, overrides?: ChatRequestOverrides): ExtendedChatRequest => {
    const { tools: overrideTools, ...restOverrides } = overrides ?? {};
    const requestTools = overrideTools ?? tools ?? undefined;
    
    return {
      message,
      conversation_id: id,
      tools: requestTools?.map((tool) => ({ name: tool.name })),
      file_ids: fileIds && fileIds.length > 0 ? fileIds : undefined,
      temperature,
      preamble,
      model,
      agent_id: agentId,
      ...restOverrides,
    };
  };

  const handleChat = async (
    { currentMessages = messages, suggestedMessage },
    overrides?: ChatRequestOverrides
  ) => {
    const message = (suggestedMessage || userMessage || '').trim();
    if (message.length === 0 || isStreaming || isParallelStreaming) {
      return;
    }

    const humanFeedback = usePersistedStore.getState().settings.humanFeedback;
    
    config?.onSend?.(message);
    setUserMessage('');

    const request = getChatRequest(message, overrides);
    const headers = {
      'Deployment-Name': deployment ?? '',
      'Deployment-Config': deploymentConfig ?? '',
    };

    let newMessages: ChatMessage[] = currentMessages;
    newMessages = newMessages.concat({
      type: MessageType.USER,
      text: message,
      files: composerFiles,
    });

    if (humanFeedback) {
      await handleParallelStreamConverse({
        newMessages,
        request,
        headers
      });
    } else {
      await handleStreamConverse({
        newMessages,
        request,
        headers,
        streamConverse: streamChat,
      });
    }
  };

  const handleParallelStreamConverse = async ({
    newMessages,
    request,
    headers,
  }: {
    newMessages: ChatMessage[];
    request: CohereChatRequest;
    headers: Record<string, string>;
  }) => {
    setConversation({ messages: newMessages });
    setIsParallelStreaming(true);
    
    // Track responses and states locally
    let botResponse1 = '';
    let botResponse2 = '';
    let streamState1 = BotState.TYPING;
    let streamState2 = BotState.TYPING;
    
    try {
      await parallelChatMutation.mutateAsync({
        request,
        headers,
        onMessage1: (eventData: ChatResponseEvent) => {
          try {
            if (eventData?.event === 'text-generation') {
              const text = eventData.data?.text || '';
              botResponse1 += text;
              
              setStreamingMessage1({
                type: MessageType.BOT,
                state: BotState.TYPING,
                text: botResponse1,
                isParallel: true
              });
            }
            else if (eventData?.event === 'stream-end') {
              const finalText = eventData.data?.text || botResponse1;
              botResponse1 = finalText;
              streamState1 = BotState.FULFILLED;
              
              setStreamingMessage1({
                type: MessageType.BOT,
                state: BotState.FULFILLED,
                text: finalText,
                isParallel: true
              });
            }
          } catch (e) {
            streamState1 = BotState.ERROR;
            setStreamingMessage1(createErrorMessage({
              text: botResponse1,
              error: e.message || STRINGS.generationError,
              isParallel: true
            }));
          }
        },
        onMessage2: (eventData: ChatResponseEvent) => {          
          try {
            if (eventData?.event === 'text-generation') {
              const text = eventData.data?.text || '';
              botResponse2 += text;
              
              setStreamingMessage2({
                type: MessageType.BOT,
                state: BotState.TYPING,
                text: botResponse2,
                isParallel: true
              });
            }
            else if (eventData?.event === 'stream-end') {
              const finalText = eventData.data?.text || botResponse2;
              botResponse2 = finalText;
              streamState2 = BotState.FULFILLED;
              
              setStreamingMessage2({
                type: MessageType.BOT,
                state: BotState.FULFILLED,
                text: finalText,
                isParallel: true
              });
            }
          } catch (e) {
            console.error('[DEBUG] Stream 2 error:', e);
            streamState2 = BotState.ERROR;
            setStreamingMessage2(createErrorMessage({
              text: botResponse2,
              error: e.message || STRINGS.generationError,
              isParallel: true
            }));
          }
        },
        onError: (error) => {
          console.error('[DEBUG] Parallel stream error:', error);
          setStreamingMessage1(createErrorMessage({
            text: botResponse1,
            error: error.message || STRINGS.generationError,
            isParallel: true
          }));
          setStreamingMessage2(createErrorMessage({
            text: botResponse2,
            error: error.message || STRINGS.generationError,
            isParallel: true
          }));
          setIsParallelStreaming(false);
        },
        onFinish: () => {
          console.log('[DEBUG] Parallel stream finished');
          
          setIsParallelStreaming(false);
          console.log('[DEBUG] Creating final parallel message');
          
          const finalMessage: ChatMessage = {
            type: MessageType.BOT,
            state: BotState.FULFILLED,
            isParallel: true,
            parallelResponses: [
              {
                id: "response1",
                text: botResponse1,
                state: streamState1
              },
              {
                id: "response2",
                text: botResponse2,
                state: streamState2
              }
            ],
            text: ""
          };
          
          console.log('[DEBUG] Final message object:', finalMessage);
          
          // Update conversation
          setConversation({ messages: [...newMessages, finalMessage] });
          
          // Clear streaming state
          setStreamingMessage1(null);
          setStreamingMessage2(null);
        }
      });
    } catch (error) {
      console.error('[DEBUG] Error in parallel streaming:', error);
      setIsParallelStreaming(false);
      setStreamingMessage1(null);
      setStreamingMessage2(null);
    }
  };

  const handleRetry = () => {
    const latestMessage = messages[messages.length - 1];

    if (latestMessage.type === MessageType.USER) {
    
      const latestMessageRemoved = messages.slice(0, -1);
      const latestUserMessage = latestMessage.text;
      handleChat({ suggestedMessage: latestUserMessage, currentMessages: latestMessageRemoved });
    } else if (latestMessage.type === MessageType.BOT) {
      
      const latestMessagesRemoved = messages.slice(0, -2);
      const latestUserMessage = messages[messages.length - 2].text;
      handleChat({ suggestedMessage: latestUserMessage, currentMessages: latestMessagesRemoved });
    }
  };

  const handleStop = () => {
    abortController.current?.abort(ABORT_REASON_USER);
    setIsStreaming(false);
    setConversation({
      messages: [
        ...messages,
        createAbortedMessage({
          text: streamingMessage?.text ?? '',
        }),
      ],
    });
    setStreamingMessage(null);
  };

  return {
    userMessage,
    isStreaming,
    isParallelStreaming,
    streamingMessage1,
    streamingMessage2,
    isStreamingToolEvents,
    handleSend: handleChat,
    handleStop,
    handleRetry,
    streamingMessage,
    setPendingMessage,
    setUserMessage,
  };
};
