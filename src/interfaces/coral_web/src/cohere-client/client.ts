import { FetchEventSourceInit, fetchEventSource } from '@microsoft/fetch-event-source';
import { ChatResponseEvent } from './types';

import {
  Body_batch_upload_file_v1_conversations_batch_upload_file_post,
  CohereChatRequest,
  CohereClientGenerated,
  CohereNetworkError,
  CohereUnauthorizedError,
  CreateAgentRequest,
  CreateSnapshotRequest,
  CreateUserV1UsersPostData,
  Fetch,
  UpdateAgentRequest,
  UpdateConversationRequest,
  UpdateDeploymentEnv,
} from '@/cohere-client';
import { usePersistedStore } from '@/stores/persistedStore';


import { mapToChatRequest } from './mappings';

export class CohereClient {
  private readonly hostname: string;
  private readonly fetch: Fetch;
  private authToken?: string;

  public cohereService: CohereClientGenerated;
  public request?: any;

  constructor({
    hostname,
    fetch,
    authToken,
  }: {
    hostname: string;
    fetch: Fetch;
    authToken?: string;
  }) {
    this.hostname = hostname;
    this.fetch = fetch;
    this.authToken = authToken;
    this.cohereService = new CohereClientGenerated({
      BASE: hostname,
      HEADERS: async () => this.getHeaders(true),
    });

    this.cohereService.request.config.interceptors.response.use((response) => {
      if (response.status === 401) {
        throw new CohereUnauthorizedError();
      }
      return response;
    });
  }

  public batchUploadFile(formData: Body_batch_upload_file_v1_conversations_batch_upload_file_post) {
    return this.cohereService.conversation.batchUploadFileV1ConversationsBatchUploadFilePost({
      formData,
    });
  }

  public deletefile({ conversationId, fileId }: { conversationId: string; fileId: string }) {
    return this.cohereService.conversation.deleteFileV1ConversationsConversationIdFilesFileIdDelete(
      {
        conversationId,
        fileId,
      }
    );
  }

  public listFiles({ conversationId }: { conversationId: string }) {
    return this.cohereService.conversation.listFilesV1ConversationsConversationIdFilesGet({
      conversationId,
    });
  }

  public async chat({
    request,
    headers,
    agentId,
    signal,
    onOpen,
    onMessage,
    onClose,
    onError,
  }: {
    request: CohereChatRequest;
    headers?: Record<string, string>;
    agentId?: string;
    signal?: AbortSignal;
    onOpen?: FetchEventSourceInit['onopen'];
    onMessage?: FetchEventSourceInit['onmessage'];
    onClose?: FetchEventSourceInit['onclose'];
    onError?: FetchEventSourceInit['onerror'];
  }) {
    const humanFeedback = usePersistedStore.getState().settings.humanFeedback;
    
    const endpoint = `${this.getEndpoint(humanFeedback ? 'chat-human-feedback' : 'chat-stream')}`;
    console.log('Selected endpoint:', endpoint);
    
    const requestBody = JSON.stringify(request);
    console.log('Final request being sent:', JSON.stringify(request, null, 2));
    return await fetchEventSource(endpoint, {
      method: 'POST',
      headers: { ...this.getHeaders(), ...headers },
      body: requestBody,
      signal,
      openWhenHidden: true,
      onopen: async (response: Response) => {
        if (
          response.status !== 200 &&
          response.headers.get('content-type')?.includes('application/json')
        ) {
          await response
            .json()
            .catch(() => {
              throw new CohereNetworkError('Failed to decode error message JSON', response.status);
            })
            .then((data) => {
              throw new CohereNetworkError(data.detail, response.status);
            });
        }
        if (onOpen) {
          onOpen(response);
        }
      },
      onmessage: onMessage,
      onclose: onClose,
      onerror: onError,
    });
  }

  public listConversations(params: { offset?: number; limit?: number; agentId?: string }) {
    return this.cohereService.conversation.listConversationsV1ConversationsGet(params);
  }

  public getConversation({ conversationId }: { conversationId: string }) {
    return this.cohereService.conversation.getConversationV1ConversationsConversationIdGet({
      conversationId,
    });
  }

  public deleteConversation({ conversationId }: { conversationId: string }) {
    return this.cohereService.conversation.deleteConversationV1ConversationsConversationIdDelete({
      conversationId,
    });
  }

  public editConversation(requestBody: UpdateConversationRequest, conversationId: string) {
    return this.cohereService.conversation.updateConversationV1ConversationsConversationIdPut({
      conversationId: conversationId,
      requestBody,
    });
  }

  public listTools({ agentId }: { agentId?: string | null }) {
    return this.cohereService.tool.listToolsV1ToolsGet({ agentId });
  }

  public listDeployments({ all }: { all?: boolean }) {
    return this.cohereService.deployment.listDeploymentsV1DeploymentsGet({ all });
  }

  public updateDeploymentEnvVariables(requestBody: UpdateDeploymentEnv, deploymentId: string) {
    return this.cohereService.deployment.updateConfigV1DeploymentsDeploymentIdUpdateConfigPost({
      deploymentId: deploymentId,
      requestBody,
    });
  }

  public updateDeploymentConfig(deploymentId: string, requestBody: UpdateDeploymentEnv) {
    return this.cohereService.deployment.updateConfigV1DeploymentsDeploymentIdUpdateConfigPost({
      deploymentId: deploymentId,
      requestBody,
    });
  }

  public getExperimentalFeatures() {
    return this.cohereService.experimentalFeatures.listExperimentalFeaturesV1ExperimentalFeaturesGet();
  }

  public login({ email, password }: { email: string; password: string }) {
    return this.cohereService.auth.loginV1LoginPost({
      requestBody: {
        strategy: 'Basic',
        payload: { email, password },
      },
    });
  }

  public logout() {
    return this.cohereService.auth.logoutV1LogoutGet();
  }

  public getAuthStrategies() {
    return this.cohereService.auth.getStrategiesV1AuthStrategiesGet();
  }

  public createUser(requestBody: CreateUserV1UsersPostData) {
    return this.cohereService.user.createUserV1UsersPost(requestBody);
  }

  public async googleSSOAuth({ code }: { code: string }) {
    const response = await this.fetch(`${this.getEndpoint('google/auth')}?code=${code}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const body = await response.json();
    this.authToken = body.token;

    if (response.status !== 200) {
      throw new CohereNetworkError('Something went wrong', response.status);
    }

    return body as { token: string };
    // FIXME(@tomtobac): generated code doesn't have code as query parameter (TLK-765)
    // this.cohereService.default.googleAuthorizeV1GoogleAuthGet();
  }

  public async oidcSSOAuth({
    code,
    strategy,
    codeVerifier,
  }: {
    code: string;
    strategy: string;
    codeVerifier?: string;
  }) {
    const body: any = {};

    if (codeVerifier) {
      // Conditionally add codeVerifier to the body
      body.code_verifier = codeVerifier;
    }

    const response = await this.fetch(
      `${this.getEndpoint('oidc/auth')}?code=${code}&strategy=${strategy}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      }
    );

    const payload = await response.json();
    this.authToken = body.token;

    if (response.status !== 200) {
      throw new CohereNetworkError('Something went wrong', response.status);
    }

    return payload as { token: string };
    // FIXME(@tomtobac): generated code doesn't have code as query parameter (TLK-765)
    // this.cohereService.default.oidcAuthorizeV1OidcAuthGet();
  }

  public getAgent(agentId: string) {
    return this.cohereService.agent.getAgentByIdV1AgentsAgentIdGet({ agentId });
  }

  public createAgent(requestBody: CreateAgentRequest) {
    return this.cohereService.agent.createAgentV1AgentsPost({ requestBody });
  }

  public listAgents({ offset, limit = 100 }: { offset?: number; limit?: number }) {
    return this.cohereService.agent.listAgentsV1AgentsGet({ offset, limit });
  }

  public updateAgent(requestBody: UpdateAgentRequest, agentId: string) {
    return this.cohereService.agent.updateAgentV1AgentsAgentIdPut({
      agentId: agentId,
      requestBody,
    });
  }

  public deleteAgent(request: { agentId: string }) {
    return this.cohereService.agent.deleteAgentV1AgentsAgentIdDelete(request);
  }

  public generateTitle({ conversationId }: { conversationId: string }) {
    return this.cohereService.conversation.generateTitleV1ConversationsConversationIdGenerateTitlePost(
      {
        conversationId,
      }
    );
  }

  public listSnapshots() {
    return this.cohereService.snapshot.listSnapshotsV1SnapshotsGet();
  }

  public createSnapshot(requestBody: CreateSnapshotRequest) {
    return this.cohereService.snapshot.createSnapshotV1SnapshotsPost({ requestBody });
  }

  public getSnapshot({ linkId }: { linkId: string }) {
    return this.cohereService.snapshot.getSnapshotV1SnapshotsLinkLinkIdGet({ linkId });
  }

  public deleteSnapshotLink({ linkId }: { linkId: string }) {
    return this.cohereService.snapshot.deleteSnapshotLinkV1SnapshotsLinkLinkIdDelete({ linkId });
  }

  public deleteSnapshot({ snapshotId }: { snapshotId: string }) {
    return this.cohereService.snapshot.deleteSnapshotV1SnapshotsSnapshotIdDelete({ snapshotId });
  }

  private getEndpoint(endpoint: 'chat-stream' | 'google/auth' | 'oidc/auth' | 'chat-human-feedback') {
    return `${this.hostname}/v1/${endpoint}`;
  }

  private getHeaders(omitContentType = false) {
    const headers: HeadersInit = {
      ...(omitContentType ? {} : { 'Content-Type': 'application/json' }),
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      'User-Id': 'user-id',
      Connection: 'keep-alive',
      'X-Date': new Date().getTime().toString(),
    };
    return headers;
  }

  public async chatParallelFeedback({
    request,
    headers,
    signal,
    onMessage1,
    onMessage2,
    onError1,
    onError2,
    onFinish,
  }: {
    request: CohereChatRequest;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    onMessage1: (data: ChatResponseEvent) => void;
    onMessage2: (data: ChatResponseEvent) => void;
    onError1?: (error: unknown) => void;
    onError2?: (error: unknown) => void;
    onFinish?: () => void;
  }) {
    const endpoint = `${this.getEndpoint('chat-human-feedback')}`;
    
    let stream1Complete = false;
    let stream2Complete = false;

    const checkCompletion = () => {
      if (stream1Complete && stream2Complete && onFinish) {
        onFinish();
      }
    };

    // Create two different request bodies
    const request1 = {
      ...request,
      stream_metadata: { id: 'stream1' }
    };

    const request2 = {
      ...request,
      stream_metadata: { id: 'stream2' }
    };

    await Promise.all([
      // Stream 1
      fetchEventSource(endpoint, {
        method: 'POST',
        headers: { 
          ...this.getHeaders(), 
          ...headers,
          'stream-id': 'stream1'
        },
        body: JSON.stringify(request1),
        signal,
        openWhenHidden: true,
        onmessage: (event: EventSourceMessage) => {
          try {
            if (!event.data) return;
            const data = JSON.parse(event.data);
            onMessage1(data);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'unable to parse event data';
            onError1?.(new Error(errMsg));
          }
        },
        onerror: onError1,
        onclose: () => {
          stream1Complete = true;
          checkCompletion();
        }
      }),

      // Stream 2  
      fetchEventSource(endpoint, {
        method: 'POST',
        headers: { 
          ...this.getHeaders(), 
          ...headers,
          'stream-id': 'stream2'
        },
        body: JSON.stringify(request2),
        signal,
        openWhenHidden: true,
        onmessage: (event: EventSourceMessage) => {
          try {
            if (!event.data) return;
            const data = JSON.parse(event.data);
            onMessage2(data);
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : 'unable to parse event data';
            onError2?.(new Error(errMsg));
          }
        },
        onerror: onError2,
        onclose: () => {
          stream2Complete = true;
          checkCompletion();
        }
      })
    ]);
  }
}
