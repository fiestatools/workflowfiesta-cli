import type { StoredConversation } from '../config'
import type { ActiveRun, AgentRunService, AgentSummary, RunEvent } from '../runs'
import type {
  AccessTokenRevealEvent,
  AuthCopDecision,
  CredentialRequestEvent,
  McpSetupEvent,
  OAuthRequestEvent,
  RunnerApprovalPendingEvent,
  RunnerApprovalResolvedEvent,
  SpecialMessage,
  SpecialMessageType,
} from '../runs/runEvents'
import type { PollHandle } from '../utils/poller'
import { ConversationStore } from '../config'
import {
  CONVERSATION_TITLE_MAX_LENGTH,
  OAUTH_POLL_INTERVAL_MS,
  OAUTH_POLL_MAX_ATTEMPTS,
} from '../constants'
import { logger } from '../logger'
import { parseSpecialMessage } from '../runs/runEvents'
import { copyToClipboard } from '../utils/clipboard'
import { openUrl } from '../utils/openUrl'
import { startPolling } from '../utils/poller'

/** A message in the chat. */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolEvents?: RunEvent[]
  isStreaming?: boolean
  /** Present when this is a guard-agent verdict, rendered as its own bubble. */
  special?: {
    type: SpecialMessageType
    decision?: AuthCopDecision
  }
}

/**
 * An interactive request a parked run is waiting on. The active request is the
 * first entry of {@link ChatState.pendingRequests}; the UI renders a form for it
 * and calls back into {@link ChatService} to fulfill or cancel it, resuming the run.
 */
export type PendingRequest
  = | { kind: 'credential', event: CredentialRequestEvent }
    | { kind: 'mcp', event: McpSetupEvent }
    | { kind: 'oauth', event: OAuthRequestEvent }

/** Result of validating candidate credential values against the live provider. */
export interface CredentialTestResult {
  ok: boolean
  detail?: string
  error?: string
  unsupported?: boolean
}

/** Outcome of fulfilling an MCP setup request. */
export interface McpSetupResult {
  credentialId: string
  needsOAuthAuthorize: boolean
}

/** Chat state change listener. */
export type ChatStateListener = (state: ChatState) => void

/** Current chat state. */
export interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  isConnecting: boolean
  isConnected: boolean
  currentAgent?: AgentSummary
  agents: AgentSummary[]
  error?: string
  /** Interactive requests a parked run is waiting on; the first is active. */
  pendingRequests: PendingRequest[]
  /** A freshly minted access token awaiting the user to copy/dismiss it. */
  pendingReveal?: AccessTokenRevealEvent
  /** Backend UID of the active conversation thread, once one exists. */
  conversationUid?: string
}

/**
 * Manages chat state and coordinates with the agent run service.
 */
export class ChatService {
  private state: ChatState = {
    messages: [],
    isTyping: false,
    isConnecting: false,
    isConnected: true,
    agents: [],
    pendingRequests: [],
  }

  private listeners = new Set<ChatStateListener>()
  private activeRun?: ActiveRun
  private conversationUid?: string
  private selectedAgentId?: string
  private defaultAgentId?: string
  private streamingMessageId?: string
  private currentToolEvents: RunEvent[] = []
  /** Title for the active thread, derived from its first user message. */
  private currentTitle?: string
  /** Backend uids of guard verdicts already shown, so live + reloaded copies don't double up. */
  private seenSpecialMessageIds = new Set<string>()
  /** Authorize URLs for parked OAuth requests, keyed by requestId (opened on connect). */
  private oauthUrls = new Map<string, string>()
  /** Active OAuth status pollers, keyed by requestId; cleared on resolve/reset/dispose. */
  private oauthPolls = new Map<string, PollHandle>()

  constructor(
    private readonly runService: AgentRunService,
    private readonly conversationStore: ConversationStore = new ConversationStore(),
  ) {}

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: ChatStateListener): () => void {
    this.listeners.add(listener)
    // Immediately notify with current state
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  /** Get current state. */
  getState(): ChatState {
    return this.state
  }

  /** Initialize the chat service (load agents). */
  async initialize(): Promise<void> {
    try {
      const [agents, defaultAgentId] = await Promise.all([
        this.runService.listAgents(),
        this.runService.resolveDefaultAgentId(),
      ])
      this.defaultAgentId = defaultAgentId
      this.selectedAgentId = defaultAgentId

      const currentAgent = agents.find(a => a.uid === this.selectedAgentId)
      this.updateState({ agents, currentAgent })
    }
    catch (err) {
      logger.warn(`Failed to load agents: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Send a message to the agent. */
  async sendMessage(text: string): Promise<void> {
    const trimmed = text.trim()
    if (!trimmed)
      return

    logger.debug('sendMessage', { length: trimmed.length })

    // The first message of a fresh thread becomes its title in the history list.
    if (!this.conversationUid && !this.currentTitle) {
      this.currentTitle
        = trimmed.length > CONVERSATION_TITLE_MAX_LENGTH
          ? `${trimmed.slice(0, CONVERSATION_TITLE_MAX_LENGTH - 1)}…`
          : trimmed
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    this.updateState({
      messages: [...this.state.messages, userMessage],
      isTyping: true,
      isConnecting: true,
      error: undefined,
    })

    // Clean up previous run
    this.activeRun?.dispose()
    this.activeRun = undefined
    this.currentToolEvents = []

    try {
      const agentId = this.selectedAgentId ?? this.defaultAgentId
      if (!agentId) {
        throw new Error('No agent available. Create one in the web app first.')
      }

      // Create streaming message placeholder
      this.streamingMessageId = crypto.randomUUID()
      const streamingMessage: ChatMessage = {
        id: this.streamingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        toolEvents: [],
      }
      this.updateState({
        messages: [...this.state.messages, streamingMessage],
      })

      this.activeRun = await this.runService.startRun(
        trimmed,
        this.conversationUid,
        agentId,
        {
          onAssistantDelta: (fullText) => {
            this.updateStreamingMessage(fullText)
            this.updateState({ isTyping: false })
          },
          onToolEvent: (event) => {
            this.currentToolEvents.push(event)
            this.updateStreamingMessage(undefined, this.currentToolEvents)
          },
          onCredentialRequest: (event) => {
            this.handleCredentialRequest(event)
          },
          onMcpSetup: (event) => {
            this.handleMcpSetup(event)
          },
          onOAuthRequest: (event) => {
            this.handleOAuthRequest(event)
          },
          onAccessTokenReveal: (event) => {
            this.handleAccessTokenReveal(event)
          },
          onRunnerApprovalPending: (event) => {
            this.handleRunnerApprovalPending(event)
          },
          onRunnerApprovalResolved: (event) => {
            this.handleRunnerApprovalResolved(event)
          },
          onSpecialMessage: (special) => {
            this.addSpecialMessage(special)
          },
          onCompleted: () => {
            this.finalizeStreamingMessage()
            this.updateState({ isTyping: false })
          },
          onError: (message) => {
            this.finalizeStreamingMessage()
            this.updateState({
              isTyping: false,
              error: message,
            })
          },
          onConnected: () => {
            this.updateState({ isConnecting: false, isConnected: true })
          },
          onDisconnected: () => {
            this.updateState({ isConnected: false })
          },
        },
      )

      this.conversationUid = this.activeRun.conversationUid
      // Remember the thread locally so it shows up in `/history`.
      this.conversationStore.upsert({
        uid: this.conversationUid,
        title: this.currentTitle,
        agentId,
      })
      this.updateState({ conversationUid: this.conversationUid })
    }
    catch (err) {
      this.finalizeStreamingMessage()
      const message = err instanceof Error ? err.message : String(err)
      this.updateState({
        isTyping: false,
        isConnecting: false,
        error: message,
      })
    }
  }

  /**
   * Interrupt the in-flight run: tear down the stream, keep whatever text has
   * streamed so far, and note the interruption. No-op when nothing is running.
   */
  stopRun(): void {
    if (!this.activeRun) {
      return
    }
    this.activeRun.dispose()
    this.activeRun = undefined
    this.finalizeStreamingMessage()
    this.updateState({ isTyping: false, isConnecting: false })
    this.addSystemMessage('Stopped.')
  }

  /**
   * Re-resolve the default agent after the local pin changed in settings. When
   * idle (no active conversation), also updates the agent the next new chat
   * will start with, so a changed default takes effect without a restart.
   */
  async refreshDefaultAgent(): Promise<void> {
    this.defaultAgentId = await this.runService.resolveDefaultAgentId()
    if (!this.conversationUid) {
      this.selectedAgentId = this.defaultAgentId
      const currentAgent = this.state.agents.find(a => a.uid === this.defaultAgentId)
      this.updateState({ currentAgent })
    }
  }

  /** Select a different agent. */
  selectAgent(agentId: string): void {
    this.selectedAgentId = agentId
    const currentAgent = this.state.agents.find(a => a.uid === agentId)
    this.updateState({ currentAgent })
  }

  /** Start a new chat. */
  newChat(): void {
    logger.debug('newChat')
    this.activeRun?.dispose()
    this.activeRun = undefined
    this.stopAllOAuthPolls()
    this.conversationUid = undefined
    this.streamingMessageId = undefined
    this.currentToolEvents = []
    this.currentTitle = undefined
    this.seenSpecialMessageIds.clear()
    this.selectedAgentId = this.defaultAgentId
    const currentAgent = this.state.agents.find(a => a.uid === this.selectedAgentId)
    this.updateState({
      messages: [],
      isTyping: false,
      isConnecting: false,
      error: undefined,
      currentAgent,
      pendingRequests: [],
      pendingReveal: undefined,
      conversationUid: undefined,
    })
  }

  /** Remembered past conversations, most-recently-updated first. */
  listConversations(): StoredConversation[] {
    return this.conversationStore.list()
  }

  /** Rename the active conversation (the `/rename <title>` command). */
  renameCurrentConversation(title: string): void {
    const trimmed = title.trim()
    if (!trimmed) {
      this.addSystemMessage('Usage: /rename <new title>')
      return
    }
    if (!this.conversationUid) {
      this.addSystemMessage('No conversation to rename yet — send a message first.')
      return
    }
    this.renameConversation(this.conversationUid, trimmed)
    this.addSystemMessage(`Renamed conversation to "${trimmed}".`)
  }

  /** Rename a conversation in local history (the backend thread is untouched). */
  renameConversation(uid: string, title: string): void {
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    this.conversationStore.rename(uid, trimmed)
    if (this.conversationUid === uid) {
      this.currentTitle = trimmed
    }
  }

  /** Forget a conversation from local history (the backend thread is untouched). */
  forgetConversation(uid: string): void {
    this.conversationStore.remove(uid)
    if (this.conversationUid === uid) {
      this.newChat()
    }
  }

  /**
   * Reopen a past conversation: tear down any active run, then load its messages
   * from the backend into the view. Subsequent turns continue the same thread.
   */
  async switchConversation(uid: string): Promise<void> {
    logger.debug('switchConversation', { uid })
    this.activeRun?.dispose()
    this.activeRun = undefined
    this.stopAllOAuthPolls()
    this.streamingMessageId = undefined
    this.currentToolEvents = []
    this.seenSpecialMessageIds.clear()
    this.conversationUid = uid

    const entry = this.conversationStore.list().find(c => c.uid === uid)
    this.currentTitle = entry?.title
    if (entry?.agentId) {
      this.selectedAgentId = entry.agentId
    }
    const currentAgent = this.state.agents.find(a => a.uid === this.selectedAgentId)

    this.updateState({
      messages: [],
      isTyping: true,
      isConnecting: false,
      error: undefined,
      currentAgent,
      pendingRequests: [],
      conversationUid: uid,
    })

    try {
      const rows = await this.runService.listConversationMessages(uid)
      const messages: ChatMessage[] = rows
        .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
        .map((m) => {
          const special = parseSpecialMessage(m.content, m.metadata, m.uid)
          if (special?.messageId) {
            this.seenSpecialMessageIds.add(special.messageId)
          }
          return {
            id: crypto.randomUUID(),
            role: m.role as ChatMessage['role'],
            content: m.content,
            timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
            special: special ? { type: special.type, decision: special.decision } : undefined,
          }
        })
      this.updateState({ messages, isTyping: false })
    }
    catch (err) {
      logger.warn(`Failed to load conversation: ${err instanceof Error ? err.message : String(err)}`)
      this.updateState({ isTyping: false, error: 'Failed to load conversation.' })
    }
  }

  /** Clear current chat (alias for newChat). */
  clearChat(): void {
    this.newChat()
  }

  /** Re-send the most recent user message (e.g. after an error). */
  retryLastMessage(): void {
    if (this.state.isTyping || this.state.pendingRequests.length > 0) {
      return
    }
    const lastUser = [...this.state.messages].reverse().find(m => m.role === 'user')
    if (lastUser) {
      void this.sendMessage(lastUser.content)
    }
  }

  /** Dispose of resources. */
  dispose(): void {
    this.activeRun?.dispose()
    this.stopAllOAuthPolls()
    this.listeners.clear()
  }

  // ---------------------------------------------------------------------------
  // Interactive request fulfillment
  //
  // A parked run broadcasts a request (credentials / MCP setup / OAuth) and
  // waits. The active request is the head of `state.pendingRequests`; the UI
  // renders a form and calls these methods to fulfill or cancel it. Fulfilling
  // resumes the run on the same WebSocket, so `activeRun` is never disposed here.
  // ---------------------------------------------------------------------------

  /** Fulfill a credential request, then advance the queue so the run resumes. */
  async submitCredential(requestId: string, fields: Record<string, string>): Promise<void> {
    await this.runService.fulfillCredential(requestId, fields)
    this.dequeueRequest(requestId)
    this.updateState({ isTyping: true })
  }

  /** Validate candidate credential values against the live provider. */
  async testCredential(
    requestId: string,
    fields: Record<string, string>,
  ): Promise<CredentialTestResult> {
    return this.runService.testCredential(requestId, fields)
  }

  /**
   * Fulfill an MCP setup request. Returns the stored credential and whether an
   * additional browser OAuth step is still required (see {@link authorizeMcp}).
   * The request is only dequeued once no further authorization is needed.
   */
  async submitMcpSetup(
    requestId: string,
    fields: Record<string, string>,
  ): Promise<McpSetupResult> {
    const result = await this.runService.fulfillMcpSetup(requestId, fields)
    if (!result.needsOAuthAuthorize) {
      this.dequeueRequest(requestId)
      this.updateState({ isTyping: true })
    }
    return result
  }

  /** Open the MCP server's OAuth authorization page in the browser. */
  async authorizeMcp(credentialId: string): Promise<boolean> {
    const url = await this.runService.buildMcpAuthorizeUrl(credentialId)
    return openUrl(url)
  }

  /** Dismiss an MCP request whose browser authorization the user has handled. */
  dismissMcpRequest(requestId: string): void {
    this.dequeueRequest(requestId)
    this.updateState({ isTyping: true })
  }

  /**
   * Open the provider's consent page for a parked OAuth request and poll its
   * status so the form reflects success/cancellation. Only opens the URL the
   * run itself broadcast. Returns whether the browser was launched.
   */
  async connectOAuth(requestId: string): Promise<boolean> {
    const url = this.oauthUrls.get(requestId)
    if (!url) {
      return false
    }
    const opened = await openUrl(url)
    this.startOAuthPoll(requestId)
    return opened
  }

  /** The authorize URL for a parked OAuth request, for manual copying. */
  getOAuthUrl(requestId: string): string | undefined {
    return this.oauthUrls.get(requestId)
  }

  /** Cancel the active request (any kind) and advance the queue. */
  async cancelPendingRequest(requestId: string, kind: PendingRequest['kind']): Promise<void> {
    this.dequeueRequest(requestId)
    try {
      if (kind === 'oauth') {
        this.stopOAuthPoll(requestId)
        await this.runService.cancelOAuthRequest(requestId)
      }
      else {
        await this.runService.cancelCredentialRequest(requestId)
      }
    }
    catch (err) {
      logger.warn(`Failed to cancel request: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /** Enqueue a request and surface it to the UI. */
  private enqueueRequest(request: PendingRequest): void {
    this.updateState({
      isTyping: false,
      pendingRequests: [...this.state.pendingRequests, request],
    })
  }

  /** Remove a request from the queue by id. */
  private dequeueRequest(requestId: string): void {
    const pendingRequests = this.state.pendingRequests.filter(
      req => req.event.requestId !== requestId,
    )
    this.updateState({ pendingRequests })
  }

  /** Poll an OAuth request until it resolves, then dequeue and report the outcome. */
  private startOAuthPoll(requestId: string): void {
    if (this.oauthPolls.has(requestId)) {
      return
    }
    const handle = startPolling({
      intervalMs: OAUTH_POLL_INTERVAL_MS,
      maxAttempts: OAUTH_POLL_MAX_ATTEMPTS,
      onTick: async () => {
        const { status } = await this.runService.getOAuthRequestStatus(requestId)
        if (status !== 'fulfilled' && status !== 'cancelled' && status !== 'expired') {
          return false
        }
        this.stopOAuthPoll(requestId)
        this.dequeueRequest(requestId)
        if (status === 'fulfilled') {
          this.updateState({ isTyping: true })
        }
        else {
          this.addSystemMessage(`OAuth authorization ${status}.`)
        }
        return true
      },
      onExhausted: () => {
        this.stopOAuthPoll(requestId)
        this.dequeueRequest(requestId)
        this.addSystemMessage('OAuth authorization timed out.')
      },
    })
    this.oauthPolls.set(requestId, handle)
  }

  /** Stop polling a single OAuth request and forget its stashed authorize URL. */
  private stopOAuthPoll(requestId: string): void {
    this.oauthPolls.get(requestId)?.stop()
    this.oauthPolls.delete(requestId)
    this.oauthUrls.delete(requestId)
  }

  /** Stop every active OAuth poll (on reset/dispose). */
  private stopAllOAuthPolls(): void {
    this.oauthPolls.forEach(handle => handle.stop())
    this.oauthPolls.clear()
    this.oauthUrls.clear()
  }

  private updateStreamingMessage(content?: string, toolEvents?: RunEvent[]): void {
    if (!this.streamingMessageId)
      return

    const messages = this.state.messages.map((msg) => {
      if (msg.id === this.streamingMessageId) {
        return {
          ...msg,
          content: content ?? msg.content,
          toolEvents: toolEvents ?? msg.toolEvents,
        }
      }
      return msg
    })
    this.updateState({ messages })
  }

  private finalizeStreamingMessage(): void {
    if (!this.streamingMessageId)
      return

    const messages = this.state.messages.map((msg) => {
      if (msg.id === this.streamingMessageId) {
        return {
          ...msg,
          isStreaming: false,
        }
      }
      return msg
    })
    this.streamingMessageId = undefined
    this.currentToolEvents = []
    this.updateState({ messages })
  }

  private handleCredentialRequest(event: CredentialRequestEvent): void {
    logger.info(`Credential request: ${event.label}`)
    this.enqueueRequest({ kind: 'credential', event })
  }

  private handleMcpSetup(event: McpSetupEvent): void {
    logger.info(`MCP setup request: ${event.label}`)
    this.enqueueRequest({ kind: 'mcp', event })
  }

  private handleOAuthRequest(event: OAuthRequestEvent): void {
    logger.info(`OAuth request: ${event.provider}`)
    // Stash the authorize URL so we only ever open the URL the run broadcast.
    this.oauthUrls.set(event.requestId, event.authorizeUrl)
    this.enqueueRequest({ kind: 'oauth', event })
  }

  private handleRunnerApprovalPending(event: RunnerApprovalPendingEvent): void {
    logger.info(`Runner approval pending: ${event.runnerName}`)
    this.addSystemMessage(
      `Runner "${event.runnerName}" is waiting for approval to continue. Approve or reject it in the runner app.`,
    )
  }

  private handleRunnerApprovalResolved(event: RunnerApprovalResolvedEvent): void {
    logger.info(`Runner approval resolved: ${event.jobId}`)
    this.addSystemMessage('Runner approval resolved — continuing.')
  }

  private handleAccessTokenReveal(event: AccessTokenRevealEvent): void {
    logger.info(`Access token created: ${event.name}`)
    // Surface the secret in a modal so the user can copy it before it's gone.
    this.updateState({ pendingReveal: event })
  }

  /** Copy the revealed access token's secret to the clipboard. */
  async copyReveal(): Promise<boolean> {
    const secret = this.state.pendingReveal?.secretKey
    return secret ? copyToClipboard(secret) : false
  }

  /** Dismiss the access-token reveal, leaving a record of its creation. */
  dismissReveal(): void {
    const reveal = this.state.pendingReveal
    if (!reveal)
      return
    this.updateState({ pendingReveal: undefined })
    this.addSystemMessage(`Access token "${reveal.name}" created.`)
  }

  /** Copy the most recent assistant reply to the clipboard. Returns success. */
  async copyLastReply(): Promise<boolean> {
    const lastAssistant = [...this.state.messages]
      .reverse()
      .find(m => m.role === 'assistant' && m.content.trim())
    if (!lastAssistant) {
      this.addSystemMessage('Nothing to copy yet.')
      return false
    }
    const ok = await copyToClipboard(lastAssistant.content)
    this.addSystemMessage(ok ? 'Copied last reply to clipboard.' : 'Copy failed — no clipboard tool found.')
    return ok
  }

  /**
   * Append a guard-agent verdict as its own bubble. Verdicts can arrive twice
   * (live frame now, stored row on a later reload); the backend message uid
   * dedupes within this session.
   */
  private addSpecialMessage(special: SpecialMessage): void {
    if (special.messageId) {
      if (this.seenSpecialMessageIds.has(special.messageId)) {
        return
      }
      this.seenSpecialMessageIds.add(special.messageId)
    }
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: special.content,
      timestamp: new Date(),
      special: { type: special.type, decision: special.decision },
    }
    this.updateState({
      messages: [...this.state.messages, message],
    })
  }

  private addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      timestamp: new Date(),
    }
    this.updateState({
      messages: [...this.state.messages, message],
    })
  }

  private updateState(partial: Partial<ChatState>): void {
    this.state = { ...this.state, ...partial }
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}
