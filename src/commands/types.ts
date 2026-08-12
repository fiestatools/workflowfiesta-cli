/** Where a command's definition came from, lowest to highest precedence. */
export type CommandSource = 'builtin' | 'config' | 'remote'

export interface Command {
  /** Primary name of the command (used with /name). */
  name: string
  /** Short alias (e.g., 'n' for 'new'). */
  alias?: string
  /** Description shown in the palette. */
  description: string
  /** Category for grouping. */
  category: 'chat' | 'settings' | 'navigation' | 'help' | 'custom'
  /** Whether the command requires arguments. */
  requiresArgs?: boolean
  /** Placeholder text for arguments. */
  argsPlaceholder?: string
  /** Whether this is a user-defined command rather than a built-in. */
  isCustom?: boolean
  /** Which layer defined this command. */
  source?: CommandSource
  /** Backend uid, for commands loaded from the API. */
  uid?: string
  /** Agent the command runs against; a command session switches to it. */
  agentId?: string
  agentName?: string
  displayName?: string
  icon?: string
  /** Prompt seeded into the input when the session starts. */
  promptTemplate?: string
}

/** One entry of a `POST /external/custom-commands` payload. */
export interface BulkCreateCommand {
  command: string
  displayName: string
  description?: string
  icon?: string
  agentUid?: string
  promptTemplate?: string
}

/** The result of a bulk create; skipped entries were left untouched. */
export interface BulkCreateResult {
  created: RemoteCustomCommand[]
  skipped: Array<{ command: string, reason: 'exists' | 'agentNotFound', message: string }>
}

/** A remote command as returned by `GET /external/custom-commands`. */
export interface RemoteCustomCommand {
  uid: string
  orgUid: string
  userUid: string | null
  command: string
  displayName: string
  description: string | null
  icon: string | null
  agentUid: string | null
  agentName: string | null
  promptTemplate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
