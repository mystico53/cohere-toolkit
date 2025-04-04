"use client";

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

import { SettingsStore, createSettingsSlice } from '@/stores/slices/settingsSlice';
import { chunkedMessagesStore, createchunkedMessagesSlice } from './slices/chunkedMessagesSlice';

type PersistedStore = SettingsStore & chunkedMessagesStore;

const useEmptyPersistedStore = create<PersistedStore>((...a) => ({
  ...createSettingsSlice(...a),
}));

export const usePersistedStore = create<PersistedStore>()(
  persist(
    (...a) => ({
      ...createSettingsSlice(...a),
      ...createchunkedMessagesSlice(...a),
    }),
    {
      name: 'persisted-store',
      version: 3,
    }
  )
);
/**
 * Wrap usePersistedStore with a hook that returns an empty store until the persisted store is hydrated.
 * This avoids an issue where the server-rendered HTML does not match with the first client render,
 * since the server cannot load from localStorage and renders with an empty store, while the client
 * would load from localStorage and render with a hydrated store.
 *
 * By waiting until after a useEffect completes for the client render, the first render will use
 * an empty store and match the server.
 *
 * @see https://github.com/pmndrs/zustand/issues/1145#issuecomment-1207233036
 */
const usePersistedStoresWithHydration = ((selector, compare) => {
  const emptyStore = useEmptyPersistedStore(selector, compare);
  const store = usePersistedStore(selector, compare);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return hydrated ? store : emptyStore;
}) as typeof usePersistedStore;

export const useSettingsStore = () => {
  return usePersistedStoresWithHydration(
    (state) => ({
      settings: state.settings,
      setSettings: state.setSettings,
      setIsConvListPanelOpen: state.setIsConvListPanelOpen,
      humanFeedback: state.settings.humanFeedback,
      setHumanFeedback: (value: boolean) => state.setSettings({ humanFeedback: value }),
      showChunkedMessages: state.settings.showChunkedMessages,
      setShowChunkedMessages: (value: boolean) => state.setSettings({ showChunkedMessages: value }),
    }),
    shallow
  );
};

export const usechunkedMessagesStore = () => {
  return usePersistedStoresWithHydration(
    (state) => ({
      chunkedMessages: state.chunkedMessages,
      startFeedbackSession: state.startFeedbackSession,
      updateStreamContent: state.updateStreamContent,
      completeStreams: state.completeStreams,
      createChunks: state.createChunks,
      showNextChunk: state.showNextChunk,
      showNextChunkForStream: state.showNextChunkForStream,
      resetFeedbackSession: state.resetFeedbackSession,
      recordFeedback: state.recordFeedback,
      resetEverything: state.resetEverything,
      setSelectedText: state.setSelectedText,        
      clearSelectedText: state.clearSelectedText,    
    }),
    shallow
  );
};