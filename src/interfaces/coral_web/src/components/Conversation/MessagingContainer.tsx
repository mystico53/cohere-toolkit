'use client';

import { Transition } from '@headlessui/react';
import { usePrevious, useTimeoutEffect } from '@react-hookz/web';
import React, { ReactNode, forwardRef, memo, useEffect, useMemo, useState } from 'react';
import ScrollToBottom, { useScrollToBottom, useSticky } from 'react-scroll-to-bottom';

import { CitationPanel } from '@/components/Citations/CitationPanel';
import MessageRow from '@/components/MessageRow';
import { Button } from '@/components/Shared';
import { Welcome } from '@/components/Welcome';
import { ReservedClasses } from '@/constants';
import { STRINGS } from '@/constants/strings';
import { MESSAGE_LIST_CONTAINER_ID, useCalculateCitationStyles } from '@/hooks/citations';
import { useFixCopyBug } from '@/hooks/fixCopyBug';
import { useAgentsStore, useCitationsStore } from '@/stores';
import { usePersistedStore } from '@/stores/persistedStore';
import { ChatMessage, MessageType, StreamingMessage, isFulfilledMessage } from '@/types/message';
import { cn } from '@/utils';

type Props = {
  isStreaming: boolean;
  isStreamingToolEvents: boolean;
  isParallelStreaming: boolean;
  startOptionsEnabled: boolean;
  messages: ChatMessage[];
  streamingMessage: StreamingMessage | null;
  streamingMessage1: StreamingMessage | null;
  streamingMessage2: StreamingMessage | null;
  agentId?: string;
  onRetry: VoidFunction;
  composer: ReactNode;
  conversationId?: string;
  scrollViewClassName?: string;
};

/**
 * This component is in charge of rendering anything in the main scrollable view.
 * This includes all of the message, the RAG citations, and the composer (which is sticky at the bottom).
 */
const MessagingContainer: React.FC<Props> = (props) => {
  const { scrollViewClassName = '', ...rest } = props;
  return (
    <ScrollToBottom
      initialScrollBehavior="auto"
      className={cn(ReservedClasses.MESSAGES, 'relative flex h-0 flex-grow flex-col')}
      scrollViewClassName={cn(
        '!h-full',
        'flex relative mt-auto overflow-x-hidden',
        {
          // For vertically centering the content in @/components/Welcome.tsx
          'mt-0 md:mt-auto': props.messages.length === 0,
        },
        scrollViewClassName
      )}
      followButtonClassName="hidden"
      debounce={100}
    >
      <Content {...rest} />
    </ScrollToBottom>
  );
};

/**
 * This component lays out the messages, citations, and composer.
 * In order to access the state hooks for the scroll to bottom component, we need to wrap the content in a component.
 */
const Content: React.FC<Props> = (props) => {
  const { 
    isStreaming, 
    messages, 
    composer, 
    streamingMessage,
    streamingMessage1,
    streamingMessage2,
    isParallelStreaming
  } = props;
  
  const scrollToBottom = useScrollToBottom();
  const {
    agents: { isEditAgentPanelOpen },
  } = useAgentsStore();
  const {
    citations: { hasCitations },
  } = useCitationsStore();

  const humanFeedback = usePersistedStore(state => state.settings.humanFeedback);

  useFixCopyBug();
  const [isAtBottom] = useSticky();
  const prevIsStreaming = usePrevious(isStreaming);

  // Wait some time before being able to fetch previous messages
  // This is to prevent loading a bunch of messages on first load
  const [isReadyToFetchPreviousMessages, setIsReadyToFetchPreviousMessages] = useState(false);
  useTimeoutEffect(() => {
    setIsReadyToFetchPreviousMessages(true);
  }, 1000);

  // Show the `New Message` button if the user has scrolled up
  // and the last message is a bot message.
  // This reruns when isAtBottom or isStreaming changes only since
  // these are the only times users may miss the newest message.
  const showNewMessageButton = useMemo(() => {
    if (isAtBottom) return false;
    if (prevIsStreaming === isStreaming) return false;
    if (humanFeedback) {
      if (!streamingMessage1 && !streamingMessage2) return false;
    } else {
      if (!streamingMessage) return false;
    }
    return true;
  }, [isAtBottom, isStreaming, prevIsStreaming, streamingMessage, streamingMessage1, streamingMessage2, humanFeedback]);

  // Scroll to bottom when the user adds a new message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === MessageType.USER) {
      scrollToBottom({ behavior: 'smooth' });
    }
  }, [messages.length, scrollToBottom]);

  const { citationToStyles, messageContainerDivRef, composerContainerDivRef } =
    useCalculateCitationStyles(messages, streamingMessage);

  const handleScrollToNewMessage = () => {
    scrollToBottom({ behavior: 'smooth' });
  };

  return (
    <div className="flex h-max min-h-full w-full">
      <div id={MESSAGE_LIST_CONTAINER_ID} className={cn('flex h-auto min-w-0 flex-1 flex-col')}>
        {humanFeedback ? (
          <ParallelMessages {...props} ref={messageContainerDivRef} />
        ) : (
          <Messages {...props} ref={messageContainerDivRef} />
        )}
        
        {/* Composer container */}
        <div
          className={cn('sticky bottom-0 px-4 pb-4', 'bg-marble-1000')}
          ref={composerContainerDivRef}
        >
          <Transition
            show={showNewMessageButton}
            enter="duration-300 ease-out transition-all"
            enterFrom="translate-y-10 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="duration-300 ease-in transition-all"
            leaveFrom="translate-y-0 opacity-100"
            leaveTo="translate-y-10 opacity-0"
            as="div"
            className="absolute bottom-full left-1/2 -z-10 flex h-fit -translate-x-1/2 transform pb-4"
          >
            <Button
              label={STRINGS.newMessage}
              splitIcon="arrow-down"
              onClick={handleScrollToNewMessage}
              hideFocusStyles
              kind="primaryOutline"
            />
          </Transition>
          {composer}
        </div>
      </div>

      {/* Only show citations panel in non-parallel mode */}
      {!humanFeedback && (
        <>
          <div
            className={cn('hidden h-auto border-marble-950', {
              'md:flex': hasCitations || !isEditAgentPanelOpen,
              'border-l': hasCitations,
            })}
          />
          <CitationPanel
            citationToStyles={citationToStyles}
            streamingMessage={streamingMessage}
            className={cn(
              ReservedClasses.CITATION_PANEL,
              'hidden',
              { 'md:flex': hasCitations },
              'relative h-auto w-auto',
              'md:min-w-citation-panel-md lg:min-w-citation-panel-lg xl:min-w-citation-panel-xl'
            )}
          />
        </>
      )}
    </div>
  );
};

type MessagesProps = Props;

/**
 * This component handles the regular single message stream view.
 * It renders messages in a single column layout with support for streaming and tool events.
 */
const Messages = forwardRef<HTMLDivElement, MessagesProps>(function MessagesInternal(
  { onRetry, messages, streamingMessage, agentId, isStreamingToolEvents },
  ref
) {
  const isChatEmpty = messages.length === 0;

  if (isChatEmpty) {
    return (
      <div className="m-auto p-4">
        <Welcome show={isChatEmpty} agentId={agentId} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-y-4 px-4 py-6 md:gap-y-6" ref={ref}>
      <div className="mt-auto flex flex-col gap-y-4 md:gap-y-6">
        {messages.map((m, i) => {
          const isLastInList = i === messages.length - 1;
          return (
            <MessageRow
              key={i}
              message={m}
              isLast={isLastInList && !streamingMessage}
              isStreamingToolEvents={isStreamingToolEvents}
              className={cn({
                // Hide the last message if it is the same as the separate streamed message
                // to avoid a flash of duplicate messages.
                hidden:
                  isLastInList &&
                  streamingMessage &&
                  isFulfilledMessage(streamingMessage) &&
                  isFulfilledMessage(m) &&
                  streamingMessage.generationId === m.generationId,
              })}
              onRetry={onRetry}
            />
          );
        })}
      </div>

      {streamingMessage && (
        <MessageRow
          isLast
          isStreamingToolEvents={isStreamingToolEvents}
          message={streamingMessage}
          onRetry={onRetry}
        />
      )}
    </div>
  );
});

type ParallelMessagesProps = Props;

/**
 * This component handles the parallel message streams view.
 * It renders messages in a two-column layout with support for simultaneous streaming.
 */
const ParallelMessages = forwardRef<HTMLDivElement, ParallelMessagesProps>(function ParallelMessagesInternal(
  { onRetry, messages, streamingMessage1, streamingMessage2, agentId, isStreamingToolEvents },
  ref
) {
  const isChatEmpty = messages.length === 0;

  if (isChatEmpty) {
    return (
      <div className="m-auto p-4">
        <Welcome show={isChatEmpty} agentId={agentId} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-y-4 px-4 py-6 md:gap-y-6" ref={ref}>
      <div className="mt-auto flex flex-col gap-y-4 md:gap-y-6">
        {messages.map((m, i) => {
          const isLastInList = i === messages.length - 1;
          return (
            <MessageRow
              key={i}
              message={m}
              isLast={isLastInList && !streamingMessage1 && !streamingMessage2}
              isStreamingToolEvents={isStreamingToolEvents}
              onRetry={onRetry}
            />
          );
        })}
      </div>

      {(streamingMessage1 || streamingMessage2) && (
        <div className="grid grid-cols-2 gap-4 border-t border-marble-950 pt-4 mt-4">
          <div className="flex flex-col">
            <div className="text-sm text-marble-400 mb-2">Response 1</div>
            {streamingMessage1 && (
              <MessageRow
                isLast={true}
                isStreamingToolEvents={isStreamingToolEvents}
                message={streamingMessage1}
                onRetry={onRetry}
              />
            )}
          </div>
          <div className="flex flex-col">
            <div className="text-sm text-marble-400 mb-2">Response 2</div>
            {streamingMessage2 && (
              <MessageRow
                isLast={true}
                isStreamingToolEvents={isStreamingToolEvents}
                message={streamingMessage2}
                onRetry={onRetry}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default memo(MessagingContainer);