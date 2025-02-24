import { FinishReason, getFinishReasonErrorMessage, CohereChatRequest } from '@/cohere-client';

export class CohereNetworkError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class CohereFinishStreamError extends Error {
  public reason: FinishReason | string | null | undefined;

  constructor(reason: string | null | undefined, error?: string | null) {
    const message = getFinishReasonErrorMessage(reason, error);
    super(message);
    this.reason = reason;
  }
}

export class CohereStreamError extends Error {
  public code: number;

  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export class CohereUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export type ExperimentalFeatures = {
  USE_AGENTS_VIEW: boolean;
};

export interface ExtendedChatRequest extends CohereChatRequest {
  humanFeedback?: boolean;
}

export interface ChatResponseEvent {
  event: string;  
  data: {
    text?: string;
    generation_id?: string;  
    conversation_id?: string;
    finish_reason?: string;
    error?: string | null;
  };
}

export interface EventSourceMessage {
  data: string;
  event?: string | null;
  id?: string | null;
  retry?: number | null;
}

export interface FetchEventSourceInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  openWhenHidden?: boolean;
  onopen?: (response: Response) => void | Promise<void>;
  onmessage?: (event: EventSourceMessage) => void;
  onclose?: () => void;
  onerror?: (error: any) => void;
}

