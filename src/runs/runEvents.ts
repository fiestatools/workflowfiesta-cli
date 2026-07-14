/**
 * Subset of the backend's WebSocket run-event contract that the CLI
 * consumes. Mirrors the extension's runEvents.ts.
 */

/** An assistant/user message pushed live as a run produces output. */
export interface ChatMessageEvent {
  id: string
  conversationId: string
  role: string
  content: string
  metadata: Record<string, unknown>
}

/**
 * Post-thread verdicts from the platform's system guard agents. The backend
 * stores them as ordinary assistant messages whose `metadata.type` carries the
 * guard's identity, and broadcasts them as `chat:message` frames after the
 * main run completes (see `temporal/activities/providers/agents/` in the
 * backend). They must not be folded into the assistant's reply.
 */
export type SpecialMessageType = 'secret_safe' | 'quality_control' | 'auth_cop'

/** Auth Cop's ruling, carried in the message's `metadata.decision`. */
export type AuthCopDecision = 'approved' | 'need_confirmation' | 'declined'

/** A guard-agent message extracted from a chat frame or a stored message row. */
export interface SpecialMessage {
  type: SpecialMessageType
  content: string
  /** Only present for `auth_cop` messages. */
  decision?: AuthCopDecision
  /** Backend message uid when known — used to dedupe live vs. reloaded copies. */
  messageId?: string
}

const SPECIAL_MESSAGE_TYPES: readonly string[] = ['secret_safe', 'quality_control', 'auth_cop']
const AUTH_COP_DECISIONS: readonly string[] = ['approved', 'need_confirmation', 'declined']

/**
 * Extract a guard-agent message from message content + metadata, or return
 * `undefined` for ordinary messages. Accepts both live `chat:message` frames
 * and rows from `GET /external/conversations/{id}/messages` (whose metadata
 * may be `null`).
 */
export function parseSpecialMessage(
  content: string,
  metadata: Record<string, unknown> | null | undefined,
  messageId?: string,
): SpecialMessage | undefined {
  const type = metadata?.type
  if (typeof type !== 'string' || !SPECIAL_MESSAGE_TYPES.includes(type)) {
    return undefined
  }
  const decision = metadata?.decision
  return {
    type: type as SpecialMessageType,
    content,
    decision: typeof decision === 'string' && AUTH_COP_DECISIONS.includes(decision)
      ? decision as AuthCopDecision
      : undefined,
    messageId,
  }
}

/** Terminal event for a run (both success and failure carry this shape). */
export interface RunCompletedEvent {
  conversationId?: string
  agentRunId: string
  status?: string
  completedAt?: string
}

/** Granular step event within a run (thinking, text, tool calls, …). */
export interface RunEvent {
  uid: string
  agentRunUid: string
  sequence: number
  eventType:
    | 'thinking'
    | 'text'
    | 'tool_call'
    | 'tool_result'
    | 'tool_progress'
    | 'skill_invoked'
    | 'script_executed'
    | 'sub_agent_spawned'
    | 'continuation_available'
    | 'error'
  content: Record<string, unknown>
  createdAt: string
}

/** A single field an agent's `request_credentials` tool asks the user to fill. */
export interface CredentialRequestField {
  key: string
  label: string
  type: 'text' | 'password'
  optional?: boolean
  hint?: string
}

/**
 * Interactive request from a parked run: the agent needs credentials the user
 * must supply before the run can continue.
 */
export interface CredentialRequestEvent {
  requestId: string
  label: string
  fields: CredentialRequestField[]
  provider?: string
  instructions?: string
  conversationId?: string
}

/**
 * Interactive request from a parked run's `setup_mcp_server` tool.
 */
export interface McpSetupEvent {
  requestId: string
  label: string
  serverUrl?: string
  serverName?: string
  conversationId?: string
}

/**
 * Interactive request from a parked run's `request_oauth_connection` tool.
 */
export interface OAuthRequestEvent {
  requestId: string
  provider: string
  authorizeUrl: string
  scopes: string[]
  label?: string
  conversationId?: string
}

/**
 * Display-only reveal from the `create_access_token` tool.
 */
export interface AccessTokenRevealEvent {
  uid: string
  name: string
  secretKey: string
  expiresAt: string
  conversationId?: string
}

/**
 * A self-hosted runner has parked a job awaiting the user's approval.
 */
export interface RunnerApprovalPendingEvent {
  jobId: string
  runnerId: string
  runnerName: string
}

/** The runner job's approval was resolved. */
export interface RunnerApprovalResolvedEvent {
  jobId: string
}

/**
 * Discriminated union of the WS frames the CLI handles.
 */
export type WsMessage
  = | { type: 'chat:message', data: ChatMessageEvent }
    | { type: 'run:event', data: RunEvent }
    | { type: 'run:event:update', data: RunEvent }
    | { type: 'run:completed', data: RunCompletedEvent }
    | { type: 'run:failed', data: RunCompletedEvent }
    | { type: 'run:generation_complete', data: RunCompletedEvent }
    | { type: 'credential_request', payload: CredentialRequestEvent }
    | { type: 'mcp_setup', payload: McpSetupEvent }
    | { type: 'oauth_request', payload: OAuthRequestEvent }
    | { type: 'access_token_revealed', payload: AccessTokenRevealEvent }
    | { type: 'runner:approval_pending', data: RunnerApprovalPendingEvent }
    | { type: 'runner:approval_resolved', data: RunnerApprovalResolvedEvent }

/** Type guard: narrow a parsed frame to a handled {@link WsMessage}. */
export function isHandledWsMessage(value: unknown): value is WsMessage {
  if (!value || typeof value !== 'object') {
    return false
  }
  const type = (value as { type?: unknown }).type
  return (
    type === 'chat:message'
    || type === 'run:event'
    || type === 'run:event:update'
    || type === 'run:completed'
    || type === 'run:failed'
    || type === 'run:generation_complete'
    || type === 'credential_request'
    || type === 'mcp_setup'
    || type === 'oauth_request'
    || type === 'access_token_revealed'
    || type === 'runner:approval_pending'
    || type === 'runner:approval_resolved'
  )
}
