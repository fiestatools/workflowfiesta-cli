import type { ConversationStore } from '../config/conversationStore'
import type { AgentRunService } from '../runs/agentRunService'
import type { RunOptions, SessionInfo } from './types'

export function validateFlags(opts: RunOptions): void {
  if (opts.continue && opts.session) {
    throw new Error('--continue and --session are mutually exclusive')
  }
}

export async function resolveSession(
  opts: RunOptions,
  conversationStore: ConversationStore,
  runService: AgentRunService,
): Promise<SessionInfo> {
  // Case 1: Explicit session ID
  if (opts.session) {
    const conversations = conversationStore.list()
    const existing = conversations.find(c => c.uid === opts.session)

    if (!existing) {
      return {
        uid: opts.session,
        agentId: opts.agent,
      }
    }

    return {
      uid: existing.uid,
      title: existing.title,
      agentId: opts.agent ?? existing.agentId,
    }
  }

  if (opts.continue) {
    const conversations = conversationStore.list()
    const last = conversations[0]

    if (!last) {
      throw new Error('No conversation to continue. Run without --continue to start a new one.')
    }

    return {
      uid: last.uid,
      title: last.title,
      agentId: opts.agent ?? last.agentId,
    }
  }

  const agentId = opts.agent ?? await runService.resolveDefaultAgentId()

  if (!agentId) {
    throw new Error('No agent specified and no default agent available. Use --agent to specify one.')
  }

  return {
    uid: '', // Empty string signals "create new"
    agentId,
  }
}

export function generateTitle(message: string): string {
  const firstLine = message.split('\n')[0] ?? ''
  const truncated = firstLine.slice(0, 50)
  return truncated.length < firstLine.length ? `${truncated}...` : truncated
}
