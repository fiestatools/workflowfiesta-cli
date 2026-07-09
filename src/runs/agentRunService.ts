import type { ApiClient } from '../api/apiClient';
import { ApiError } from '../api/errors';
import { getConfiguredAgentId } from '../config/settings';
import { RunStream } from './runStream';
import type {
  RunEvent,
  CredentialRequestEvent,
  McpSetupEvent,
  OAuthRequestEvent,
  AccessTokenRevealEvent,
  RunnerApprovalPendingEvent,
  RunnerApprovalResolvedEvent,
} from './runEvents';

/** Response from `POST /external/agents/{id}/runs`. */
interface AgentRunResponse {
  conversationUid: string;
  messageUid: string;
  agentRunUid: string;
  workflowRunUid: string;
}

/** Agent shape from `GET /external/agents`. */
export interface AgentSummary {
  uid: string;
  name: string;
  description: string | null;
}

/** Minimal message shape from `GET /external/conversations/{id}/messages`. */
interface MessageSummary {
  role: string;
  content: string;
  createdAt?: string;
}

/** Callbacks the chat surface implements to render a run's progress. */
export interface AgentRunHandlers {
  /** The assistant's reply so far (full accumulated text). */
  onAssistantDelta(fullText: string): void;
  /** A non-text run event (thinking, tool_call, etc.). */
  onToolEvent(event: RunEvent): void;
  /** The run is parked awaiting credentials. */
  onCredentialRequest(event: CredentialRequestEvent): void;
  /** The run is parked awaiting MCP server configuration. */
  onMcpSetup(event: McpSetupEvent): void;
  /** The run is parked awaiting an OAuth connection. */
  onOAuthRequest(event: OAuthRequestEvent): void;
  /** A freshly created access token to reveal. */
  onAccessTokenReveal(event: AccessTokenRevealEvent): void;
  /** A self-hosted runner has parked a job awaiting approval. */
  onRunnerApprovalPending?(event: RunnerApprovalPendingEvent): void;
  /** A parked runner job's approval was resolved. */
  onRunnerApprovalResolved?(event: RunnerApprovalResolvedEvent): void;
  /** The run finished successfully. */
  onCompleted(): void;
  /** The run failed, or the stream errored. */
  onError(message: string): void;
  /** WebSocket connection established (optional). */
  onConnected?(): void;
  /** WebSocket connection lost (optional). */
  onDisconnected?(): void;
}

/** Read a string field off a run event's `content` bag, if present. */
function stringField(content: Record<string, unknown>, key: string): string | undefined {
  const value = content[key];
  return typeof value === 'string' ? value : undefined;
}

/** Handle to an in-flight run. */
export interface ActiveRun {
  conversationUid: string;
  dispose(): void;
}

/**
 * Starts agent runs on the backend and bridges their `/ws` event stream to the
 * chat interface.
 */
export class AgentRunService {
  /** The token's org id, resolved lazily and cached. */
  private orgId?: string;

  constructor(
    private readonly api: ApiClient,
    /** Resolves the WebSocket base URL. */
    private readonly getWsBaseUrl: () => Promise<string>,
    /** Resolves the API base URL. */
    private readonly getApiBaseUrl: () => Promise<string>,
  ) {}

  /** The org's agents, for populating the agent picker. */
  async listAgents(): Promise<AgentSummary[]> {
    return this.api.get<AgentSummary[]>('/external/agents');
  }

  /** Recent messages in a conversation, oldest-first, for reopening a thread. */
  async listConversationMessages(
    conversationUid: string,
    limit = 100,
  ): Promise<{ role: string; content: string; createdAt?: string }[]> {
    return this.api.get<MessageSummary[]>(`/external/conversations/${conversationUid}/messages`, {
      query: { limit },
    });
  }

  /** Fulfill a credential request from a parked run. */
  async fulfillCredential(requestId: string, fields: Record<string, string>): Promise<void> {
    await this.api.post(`/external/credential-requests/${requestId}/fulfill`, { fields });
  }

  /** Test credential values against the live provider. */
  async testCredential(
    requestId: string,
    fields: Record<string, string>,
  ): Promise<{ ok: boolean; detail?: string; error?: string; unsupported?: boolean }> {
    try {
      return await this.api.post<{ ok: boolean; detail?: string; error?: string }>(
        `/external/credential-requests/${requestId}/test`,
        { fields },
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const body = err.body as { error?: string } | undefined;
        return {
          ok: false,
          unsupported: true,
          error: body?.error ?? 'Validation is not supported for this credential.',
        };
      }
      throw err;
    }
  }

  /** Fulfill an MCP setup request. */
  async fulfillMcpSetup(
    requestId: string,
    fields: Record<string, string>,
  ): Promise<{ credentialId: string; needsOAuthAuthorize: boolean }> {
    const res = await this.api.post<{ credentialId: string; needsOAuthAuthorize?: boolean }>(
      `/external/credential-requests/${requestId}/fulfill`,
      { fields },
    );
    return {
      credentialId: res.credentialId,
      needsOAuthAuthorize: res.needsOAuthAuthorize === true,
    };
  }

  /** Cancel a pending credential/MCP request. */
  async cancelCredentialRequest(requestId: string): Promise<void> {
    await this.api.post(`/external/credential-requests/${requestId}/cancel`, {});
  }

  /** Current status of an OAuth connection request. */
  async getOAuthRequestStatus(
    requestId: string,
  ): Promise<{ status: string; credentialId: string | null }> {
    const res = await this.api.get<{ status: string; credentialId: string | null }>(
      `/external/oauth-requests/${requestId}`,
    );
    return { status: res.status, credentialId: res.credentialId ?? null };
  }

  /** Cancel a pending OAuth connection request. */
  async cancelOAuthRequest(requestId: string): Promise<void> {
    await this.api.post(`/external/oauth-requests/${requestId}/cancel`, {});
  }

  /** The token's org id, needed to build the MCP OAuth authorize URL. */
  async getOrgId(): Promise<string> {
    if (!this.orgId) {
      const me = await this.api.get<{ orgId: string }>('/external/me');
      this.orgId = me.orgId;
    }
    return this.orgId;
  }

  /** Build the MCP OAuth authorize URL. */
  async buildMcpAuthorizeUrl(credentialId: string): Promise<string> {
    const [apiBase, orgId] = await Promise.all([this.getApiBaseUrl(), this.getOrgId()]);
    const params = new URLSearchParams({ credentialUid: credentialId, orgId });
    return `${apiBase}/api/oauth/mcp/authorize?${params.toString()}`;
  }

  /** Resolve the default agent. */
  async resolveDefaultAgentId(): Promise<string | undefined> {
    const configured = getConfiguredAgentId();
    if (configured) {
      return configured;
    }
    const me = await this.api.get<{ defaultAgentId: string | null }>('/external/me');
    if (me.defaultAgentId) {
      return me.defaultAgentId;
    }
    const agents = await this.listAgents();
    return agents[0]?.uid;
  }

  /**
   * Start a run with `agentId` and stream its output to `handlers`.
   */
  async startRun(
    prompt: string,
    conversationUid: string | undefined,
    agentId: string,
    handlers: AgentRunHandlers,
  ): Promise<ActiveRun> {
    const run = await this.api.post<AgentRunResponse>(`/external/agents/${agentId}/runs`, {
      prompt,
      conversationUid,
    });

    const wsBaseUrl = await this.getWsBaseUrl();
    let streamedAny = false;
    let finished = false;
    let finalizeTimer: ReturnType<typeof setTimeout> | undefined;

    const finishOnce = (fn: () => void): void => {
      if (finished) {
        return;
      }
      finished = true;
      if (finalizeTimer) {
        clearTimeout(finalizeTimer);
        finalizeTimer = undefined;
      }
      fn();
    };

    const finalizeRun = (): void => {
      finishOnce(() => {
        stream.close();
        void this.finalize(run.conversationUid, streamedAny, handlers);
      });
    };

    const stream = new RunStream(
      { runId: run.agentRunUid, conversationId: run.conversationUid, wsBaseUrl },
      {
        onRunEvent: (event) => {
          if (event.eventType === 'text') {
            const fullText = stringField(event.content, 'fullText');
            if (fullText) {
              streamedAny = true;
              handlers.onAssistantDelta(fullText);
            }
          } else if (event.eventType === 'error') {
            stream.close();
            handlers.onError(stringField(event.content, 'message') ?? 'The agent run errored.');
          } else {
            handlers.onToolEvent(event);
          }
        },
        onChatMessage: (event) => {
          if (event.role === 'assistant' && event.content) {
            streamedAny = true;
            handlers.onAssistantDelta(event.content);
          }
        },
        onCredentialRequest: (event) => {
          handlers.onCredentialRequest(event);
        },
        onMcpSetup: (event) => {
          handlers.onMcpSetup(event);
        },
        onOAuthRequest: (event) => {
          handlers.onOAuthRequest(event);
        },
        onAccessTokenReveal: (event) => {
          handlers.onAccessTokenReveal(event);
        },
        onRunnerApprovalPending: (event) => {
          handlers.onRunnerApprovalPending?.(event);
        },
        onRunnerApprovalResolved: (event) => {
          handlers.onRunnerApprovalResolved?.(event);
        },
        onGenerationComplete: () => {
          if (!finalizeTimer && !finished) {
            finalizeTimer = setTimeout(finalizeRun, 1500);
          }
        },
        onCompleted: () => {
          finalizeRun();
        },
        onFailed: () => {
          finishOnce(() => {
            stream.close();
            handlers.onError('The agent run failed.');
          });
        },
        onError: (error) => {
          finishOnce(() => {
            stream.close();
            handlers.onError(error.message);
          });
        },
        onConnected: () => {
          handlers.onConnected?.();
        },
        onDisconnected: () => {
          handlers.onDisconnected?.();
        },
      },
    );
    stream.open();

    return {
      conversationUid: run.conversationUid,
      dispose: () => stream.close(),
    };
  }

  /**
   * Report completion, reconciling a missed reply first.
   */
  private async finalize(
    conversationUid: string,
    streamedAny: boolean,
    handlers: AgentRunHandlers,
  ): Promise<void> {
    if (!streamedAny) {
      try {
        const messages = await this.api.get<MessageSummary[]>(
          `/external/conversations/${conversationUid}/messages`,
          { query: { limit: 5 } },
        );
        const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
        if (lastAssistant?.content) {
          handlers.onAssistantDelta(lastAssistant.content);
        }
      } catch {
        // Reconciliation is best-effort.
      }
    }
    handlers.onCompleted();
  }
}
