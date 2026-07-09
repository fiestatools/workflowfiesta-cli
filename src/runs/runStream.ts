import { logger } from '../logger';
import {
  isHandledWsMessage,
  type AccessTokenRevealEvent,
  type ChatMessageEvent,
  type CredentialRequestEvent,
  type McpSetupEvent,
  type OAuthRequestEvent,
  type RunCompletedEvent,
  type RunEvent,
  type RunnerApprovalPendingEvent,
  type RunnerApprovalResolvedEvent,
} from './runEvents';

/**
 * Frame types dropped so far, logged once each.
 */
const loggedDroppedTypes = new Set<string>();

/** Callbacks invoked as run-event frames arrive. All are optional. */
export interface RunStreamHandlers {
  onChatMessage?(event: ChatMessageEvent): void;
  onRunEvent?(event: RunEvent): void;
  onCompleted?(event: RunCompletedEvent): void;
  onFailed?(event: RunCompletedEvent): void;
  /** The model finished producing its final text. */
  onGenerationComplete?(event: RunCompletedEvent): void;
  /** The parked run needs credentials from the user before it can continue. */
  onCredentialRequest?(event: CredentialRequestEvent): void;
  /** The parked run needs the user to configure an MCP server. */
  onMcpSetup?(event: McpSetupEvent): void;
  /** The parked run needs the user to authorize an OAuth provider. */
  onOAuthRequest?(event: OAuthRequestEvent): void;
  /** A freshly created access token to reveal once for the user to copy. */
  onAccessTokenReveal?(event: AccessTokenRevealEvent): void;
  /** A self-hosted runner has parked a job awaiting approval. */
  onRunnerApprovalPending?(event: RunnerApprovalPendingEvent): void;
  /** A parked runner job's approval was resolved. */
  onRunnerApprovalResolved?(event: RunnerApprovalResolvedEvent): void;
  /** Transport-level failure (connect/socket error). */
  onError?(error: Error): void;
  /** Called when the connection is established. */
  onConnected?(): void;
  /** Called when the connection is lost. */
  onDisconnected?(code: number, reason: string): void;
}

/** Keep-alive cadence; the server replies `pong` to `ping` text frames. */
const PING_INTERVAL_MS = 30_000;

/** Maximum number of reconnection attempts. */
const MAX_RETRIES = 5;

/** Base delay between reconnection attempts (ms). */
const BASE_RECONNECTION_DELAY_MS = 1_000;

/** Maximum delay between reconnection attempts (ms). */
const MAX_RECONNECTION_DELAY_MS = 30_000;

/**
 * Subscribes to a single run's event stream over the backend `/ws` WebSocket.
 *
 * Implements manual reconnection with exponential backoff for Bun WebSocket.
 */
export class RunStream {
  private ws?: WebSocket;
  private pingTimer?: ReturnType<typeof setInterval>;
  private closed = false;
  private retryAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly params: { runId: string; conversationId: string; wsBaseUrl: string },
    private readonly handlers: RunStreamHandlers,
  ) {}

  /** Open the socket and begin dispatching frames to the handlers. */
  open(): void {
    if (this.ws || this.closed) {
      return;
    }
    this.connect();
  }

  private connect(): void {
    const url = new URL(`${this.params.wsBaseUrl}/ws`);
    url.searchParams.set('runId', this.params.runId);
    url.searchParams.set('conversationIds', this.params.conversationId);

    try {
      this.ws = new WebSocket(url.toString());
    } catch (err) {
      this.handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener('open', () => {
      this.retryAttempts = 0;
      this.startPing();
      this.handlers.onConnected?.();
    });

    this.ws.addEventListener('message', (event: MessageEvent) => {
      this.handleFrame(String(event.data));
    });

    this.ws.addEventListener('error', (event) => {
      if (!this.closed) {
        const error = new Error('WebSocket error');
        this.handlers.onError?.(error);
      }
    });

    this.ws.addEventListener('close', (event: CloseEvent) => {
      this.stopPing();
      this.ws = undefined;
      if (!this.closed) {
        this.handlers.onDisconnected?.(event.code, event.reason);
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.retryAttempts >= MAX_RETRIES) {
      return;
    }

    const delay = Math.min(
      BASE_RECONNECTION_DELAY_MS * Math.pow(1.5, this.retryAttempts),
      MAX_RECONNECTION_DELAY_MS,
    );
    this.retryAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) {
        logger.info(`[runStream] Reconnecting (attempt ${this.retryAttempts}/${MAX_RETRIES})`);
        this.connect();
      }
    }, delay);
  }

  /** Close the socket and stop keep-alive. Idempotent. */
  close(): void {
    this.closed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.ws?.close();
    this.ws = undefined;
  }

  /** Force a reconnection. */
  reconnect(): void {
    if (!this.closed) {
      this.ws?.close();
      this.ws = undefined;
      this.retryAttempts = 0;
      this.connect();
    }
  }

  /** Get the current connection state. */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /** Get the number of reconnection attempts made. */
  get retryCount(): number {
    return this.retryAttempts;
  }

  private handleFrame(data: string): void {
    if (data === 'pong') {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isHandledWsMessage(parsed)) {
      const type = (parsed as { type?: unknown })?.type;
      const key = typeof type === 'string' ? type : 'unknown';
      if (!loggedDroppedTypes.has(key)) {
        loggedDroppedTypes.add(key);
        logger.info(`[runStream] dropped unhandled frame type: ${key}`);
      }
      return;
    }

    switch (parsed.type) {
      case 'chat:message':
        this.handlers.onChatMessage?.(parsed.data);
        break;
      case 'run:event':
      case 'run:event:update':
        this.handlers.onRunEvent?.(parsed.data);
        break;
      case 'run:completed':
        this.handlers.onCompleted?.(parsed.data);
        break;
      case 'run:generation_complete':
        this.handlers.onGenerationComplete?.(parsed.data);
        break;
      case 'run:failed':
        this.handlers.onFailed?.(parsed.data);
        break;
      case 'credential_request':
        this.handlers.onCredentialRequest?.(parsed.payload);
        break;
      case 'mcp_setup':
        this.handlers.onMcpSetup?.(parsed.payload);
        break;
      case 'oauth_request':
        this.handlers.onOAuthRequest?.(parsed.payload);
        break;
      case 'access_token_revealed':
        this.handlers.onAccessTokenReveal?.(parsed.payload);
        break;
      case 'runner:approval_pending':
        this.handlers.onRunnerApprovalPending?.(parsed.data);
        break;
      case 'runner:approval_resolved':
        this.handlers.onRunnerApprovalResolved?.(parsed.data);
        break;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }
}
