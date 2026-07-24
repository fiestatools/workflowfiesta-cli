import type { CommandConfig } from './config'
import { getConfigManager } from './config'

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
  /** Whether this is a user-defined command from config. */
  isCustom?: boolean
}

/** All built-in commands. */
export const BUILTIN_COMMANDS: Command[] = [
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
  {
    name: 'account',
    description: 'Switch between accounts',
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

function commandConfigToCommand(config: CommandConfig): Command {
  return {
    name: config.name,
    alias: config.alias,
    description: config.description,
    category: config.category ?? 'chat',
    requiresArgs: config.requiresArgs,
    argsPlaceholder: config.argsPlaceholder,
    isCustom: true,
  }
}

let cachedCommands: Command[] | null = null

export function getCommands(): Command[] {
  if (cachedCommands) {
    return cachedCommands
  }

  const commandMap = new Map<string, Command>()
  for (const cmd of BUILTIN_COMMANDS) {
    commandMap.set(cmd.name, cmd)
  }

  try {
    const projectConfig = getConfigManager().getProjectConfig()
    for (const [name, cmdConfig] of projectConfig.commands) {
      const existingCmd = commandMap.get(name)
      if (existingCmd) {
        commandMap.set(name, {
          ...existingCmd,
          ...commandConfigToCommand(cmdConfig),
        })
      }
      else {
        commandMap.set(name, commandConfigToCommand(cmdConfig))
      }
    }
  }
  catch {
    // Ignore config errors, use built-in commands only
  }

  cachedCommands = Array.from(commandMap.values())
  return cachedCommands
}

/**
 * Clear the cached commands list (call after config changes).
 */
export function clearCommandsCache(): void {
  cachedCommands = null
}

/**
 * All available commands (alias for getCommands() for backwards compatibility).
 * @deprecated Use getCommands() instead for dynamic command loading.
 */
export const COMMANDS: Command[] = BUILTIN_COMMANDS

/**
 * Filter commands by search query.
 * Matches against name, alias, and description.
 */
export function filterCommands(query: string): Command[] {
  const commands = getCommands()

  if (!query)
    return commands

  const lowerQuery = query.toLowerCase()

  return commands.filter((cmd) => {
    const nameMatch = cmd.name.toLowerCase().startsWith(lowerQuery)
    const aliasMatch = cmd.alias?.toLowerCase().startsWith(lowerQuery)
    const descMatch = cmd.description.toLowerCase().includes(lowerQuery)
    return nameMatch || aliasMatch || descMatch
  })
}

export function findCommand(nameOrAlias: string): Command | undefined {
  const commands = getCommands()
  const lower = nameOrAlias.toLowerCase()
  return commands.find(
    cmd => cmd.name.toLowerCase() === lower || cmd.alias?.toLowerCase() === lower,
  )
}

export function parseCommandInput(raw: string): { word: string, args: string } {
  const trimmed = raw.trimStart()
  const spaceIdx = trimmed.search(/\s/)
  if (spaceIdx === -1) {
    return { word: trimmed, args: '' }
  }
  return { word: trimmed.slice(0, spaceIdx), args: trimmed.slice(spaceIdx + 1).trim() }
}
