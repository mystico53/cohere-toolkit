import { StateCreator } from 'zustand';

const INITIAL_STATE: Required<State> = {
  isConfigDrawerOpen: false,
  activeConfigDrawerTab: '',
  isConvListPanelOpen: true,
  isMobileConvListPanelOpen: false,
  humanFeedback: true,
  showChunkedMessages: true,
};

type State = {
  isConfigDrawerOpen: boolean;
  activeConfigDrawerTab: string;
  isConvListPanelOpen: boolean;
  isMobileConvListPanelOpen: boolean;
  humanFeedback: boolean;
  showChunkedMessages: boolean;
};

type Actions = {
  setSettings: (settings: Partial<State>) => void;
  setIsConvListPanelOpen: (isOpen: boolean) => void;
  setHumanFeedback: (humanFeedback: boolean) => void;
  setShowChunkedMessages: (enabled: boolean) => void;
};

export type SettingsStore = {
  settings: State;
} & Actions;

export const createSettingsSlice: StateCreator<SettingsStore, [], [], SettingsStore> = (set) => ({
  setSettings(settings) {
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    }));
  },
  setIsConvListPanelOpen(isOpen) {
    set((state) => ({
      settings: {
        ...state.settings,
        isConvListPanelOpen: isOpen,
        isMobileConvListPanelOpen: isOpen,
      },
    }));
  },
  setShowChunkedMessages(enabled) {
    set((state) => ({
      settings: {
        ...state.settings,
        showChunkedMessages: enabled,
      },
    }));
  },
  settings: INITIAL_STATE,
});