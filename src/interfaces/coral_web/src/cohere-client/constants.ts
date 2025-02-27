// @todo: import from generated types when available
export enum FinishReason {
  ERROR = 'ERROR',
  COMPLETE = 'COMPLETE',
  MAX_TOKENS = 'MAX_TOKENS',
}

// Chat
export const COHERE_PLATFORM_DEPLOYMENT = 'Cohere Platform';
export const SAGEMAKER_DEPLOYMENT = 'SageMaker';
export const COHERE_PLATFORM_DEPLOYMENT_DEFAULT_CHAT_MODEL = 'c4ai-aya-expanse-32b';
export const SAGEMAKER_DEPLOYMENT_DEFAULT_CHAT_MODEL = 'command-r';

export const DEFAULT_CHAT_TEMPERATURE = 1.0;
export const DEFAULT_CHAT_TOOL = 'Wikipedia';
export const FILE_TOOL_CATEGORY = 'File loader';
