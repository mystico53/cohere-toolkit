import { DEFAULT_CHAT_TEMPERATURE, COHERE_PLATFORM_DEPLOYMENT_DEFAULT_CHAT_MODEL } from '@/cohere-client';

export const useSettingsDefaults = () => {
  return {
    preamble: '',
    temperature: DEFAULT_CHAT_TEMPERATURE,
    model: 'c4ai-aya-expanse-32b',
    tools: [],
  };
};
