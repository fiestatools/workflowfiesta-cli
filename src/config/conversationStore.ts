import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { MAX_STORED_CONVERSATIONS } from '../constants'
import { logger } from '../logger'

/** A locally remembered conversation, keyed by its backend conversation UID. */
export interface StoredConversation {
  /** Backend conversation UID (from a run's `conversationUid`). */
  uid: string
  /** Human-friendly title, derived from the first user message. */
  title: string
  /** Agent the thread was last run with, if known. */
  agentId?: string
  /** ISO timestamp of the last activity, used for ordering. */
  updatedAt: string
}

/**
 * Persists a lightweight index of past conversations to
 * `~/.config/workflowfiesta/cli/conversations.json`.
 *
 * The `/external/*` API has no "list conversations" endpoint (that surface is
 * session-only), so — like the extension's webview state — the CLI remembers
 * threads locally. Messages themselves are re-fetched from the backend by UID
 * when a conversation is reopened; only the index lives here.
 */
export class ConversationStore {
  private readonly filePath: string
  private cache: StoredConversation[] | null = null

  constructor(configDir?: string) {
    const baseDir = configDir ?? join(homedir(), '.config', 'workflowfiesta', 'cli')
    this.filePath = join(baseDir, 'conversations.json')
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true, mode: 0o700 })
    }
  }

  /** All remembered conversations, most-recently-updated first. */
  list(): StoredConversation[] {
    if (this.cache) {
      return this.cache
    }
    if (!existsSync(this.filePath)) {
      this.cache = []
      return this.cache
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf-8')) as StoredConversation[]
      this.cache = Array.isArray(parsed) ? parsed : []
    }
    catch (err) {
      logger.warn(`Failed to read conversation store: ${err instanceof Error ? err.message : String(err)}`)
      this.cache = []
    }
    return this.cache
  }

  /**
   * Record (or refresh) a conversation. Existing entries keep their original
   * title unless one hasn't been set yet; the timestamp is always bumped so the
   * thread floats to the top of the list.
   */
  upsert(entry: { uid: string, title?: string, agentId?: string }): void {
    const list = this.list()
    const existing = list.find(c => c.uid === entry.uid)
    const now = new Date().toISOString()

    if (existing) {
      if (entry.title && !existing.title) {
        existing.title = entry.title
      }
      if (entry.agentId) {
        existing.agentId = entry.agentId
      }
      existing.updatedAt = now
    }
    else {
      list.unshift({
        uid: entry.uid,
        title: entry.title || 'Untitled conversation',
        agentId: entry.agentId,
        updatedAt: now,
      })
    }

    // Newest first, capped.
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    this.cache = list.slice(0, MAX_STORED_CONVERSATIONS)
    this.persist()
  }

  /** Rename a conversation in the local index. Unknown UIDs are ignored. */
  rename(uid: string, title: string): void {
    const entry = this.list().find(c => c.uid === uid)
    if (!entry || !title) {
      return
    }
    entry.title = title
    this.persist()
  }

  /** Forget a conversation (local index only — the backend thread is untouched). */
  remove(uid: string): void {
    this.cache = this.list().filter(c => c.uid !== uid)
    this.persist()
  }

  private persist(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.cache ?? [], null, 2), { mode: 0o600 })
    }
    catch (err) {
      logger.warn(`Failed to write conversation store: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
