import type { Command } from './types'

/** All built-in commands. */
export const BUILTIN_COMMANDS: Command[] = [
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
  {
    name: 'exit-command',
    description: 'Leave the active command session',
    category: 'chat',
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
  {
    name: 'refresh-commands',
    description: 'Reload custom commands from the server',
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
  {
    name: 'skills',
    description: 'Browse and load agent skills',
    category: 'settings',
  },
].map(command => ({ ...command, source: 'builtin' }) as Command)

/** Names and aliases that a custom command may never shadow. */
export const RESERVED_COMMAND_WORDS: ReadonlySet<string> = new Set(
  BUILTIN_COMMANDS.flatMap(cmd => [cmd.name, cmd.alias].filter((word): word is string => Boolean(word))).map(word =>
    word.toLowerCase(),
  ),
)
