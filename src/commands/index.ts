import type { Command } from './types'
import { BUILTIN_COMMANDS } from './builtins'
import { getCommandRegistry } from './registry'

export { BUILTIN_COMMANDS, RESERVED_COMMAND_WORDS } from './builtins'
export { CustomCommandService } from './customCommandService'
export type { CustomCommandServiceOptions } from './customCommandService'
export { renderPromptTemplate } from './promptTemplate'
export { CommandRegistry, getCommandRegistry, resetCommandRegistry } from './registry'
export type { CommandsListener } from './registry'
export { RemoteCommandCache } from './remoteCommandCache'
export type { Command, CommandSource, NewCustomCommand, PublishCommandsResult, RemoteCustomCommand } from './types'

/** The merged list of built-in, config-file, and remote commands. */
export function getCommands(): Command[] {
  return getCommandRegistry().getCommands()
}

/**
 * All available commands.
 * @deprecated Use {@link getCommands} — this only ever holds the built-ins.
 */
export const COMMANDS: Command[] = BUILTIN_COMMANDS

/**
 * Filter commands by search query.
 * Matches against name, alias, and description.
 */
export function filterCommands(query: string, commands: Command[] = getCommands()): Command[] {
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

export function findCommand(nameOrAlias: string, commands: Command[] = getCommands()): Command | undefined {
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
