/**
 * Command definitions for the CLI command palette.
 */

/** A command that can be executed from the command palette. */
export interface Command {
  /** Primary name of the command (used with /name). */
  name: string
  /** Short alias (e.g., 'n' for 'new'). */
  alias?: string
  /** Description shown in the palette. */
  description: string
  /** Category for grouping. */
  category: 'chat' | 'settings' | 'navigation' | 'help'
  /** Whether the command requires arguments. */
  requiresArgs?: boolean
  /** Placeholder text for arguments. */
  argsPlaceholder?: string
}

/** All available commands. */
export const COMMANDS: Command[] = [
  // Chat commands
  {
    name: 'new',
    alias: 'n',
    description: 'Start a new conversation',
    category: 'chat',
  },
  {
    name: 'clear',
    alias: 'c',
    description: 'Clear current conversation',
    category: 'chat',
  },
  {
    name: 'retry',
    alias: 'r',
    description: 'Retry the last message',
    category: 'chat',
  },
  {
    name: 'copy',
    description: 'Copy the last reply to the clipboard',
    category: 'chat',
  },
  {
    name: 'agent',
    alias: 'a',
    description: 'Switch to a different agent',
    category: 'chat',
  },
  {
    name: 'rename',
    description: 'Rename the current conversation',
    category: 'chat',
    requiresArgs: true,
    argsPlaceholder: '<new title>',
  },

  // Settings commands
  {
    name: 'settings',
    alias: 's',
    description: 'Open settings panel',
    category: 'settings',
  },
  {
    name: 'theme',
    alias: 't',
    description: 'Change color theme',
    category: 'settings',
  },
  {
    name: 'model',
    alias: 'm',
    description: 'Switch AI model',
    category: 'settings',
  },

  // Navigation commands
  {
    name: 'panel',
    alias: 'p',
    description: 'Toggle side panel',
    category: 'navigation',
  },
  {
    name: 'history',
    alias: 'h',
    description: 'View conversation history',
    category: 'navigation',
  },

  // Help commands
  {
    name: 'help',
    alias: '?',
    description: 'Show help and shortcuts',
    category: 'help',
  },
  {
    name: 'version',
    alias: 'v',
    description: 'Show version info',
    category: 'help',
  },
  {
    name: 'status',
    description: 'Show current status',
    category: 'help',
  },
]

/**
 * Filter commands by search query.
 * Matches against name, alias, and description.
 */
export function filterCommands(query: string): Command[] {
  if (!query)
    return COMMANDS

  const lowerQuery = query.toLowerCase()

  return COMMANDS.filter((cmd) => {
    const nameMatch = cmd.name.toLowerCase().startsWith(lowerQuery)
    const aliasMatch = cmd.alias?.toLowerCase().startsWith(lowerQuery)
    const descMatch = cmd.description.toLowerCase().includes(lowerQuery)
    return nameMatch || aliasMatch || descMatch
  })
}

/**
 * Find a command by exact name or alias.
 */
export function findCommand(nameOrAlias: string): Command | undefined {
  const lower = nameOrAlias.toLowerCase()
  return COMMANDS.find(
    cmd => cmd.name.toLowerCase() === lower || cmd.alias?.toLowerCase() === lower,
  )
}

/**
 * Split palette input (without the leading /) into the command word and the
 * argument string that follows it (e.g. "rename My title" → word "rename",
 * args "My title"). Argument casing and inner whitespace are preserved.
 */
export function parseCommandInput(raw: string): { word: string, args: string } {
  const trimmed = raw.trimStart()
  const spaceIdx = trimmed.search(/\s/)
  if (spaceIdx === -1) {
    return { word: trimmed, args: '' }
  }
  return { word: trimmed.slice(0, spaceIdx), args: trimmed.slice(spaceIdx + 1).trim() }
}
