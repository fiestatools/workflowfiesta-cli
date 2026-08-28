import type { CommandConfig } from '../config'
import type { Command, RemoteCustomCommand } from './types'
import { logger } from '../logger'
import { BUILTIN_COMMANDS, RESERVED_COMMAND_WORDS } from './builtins'

/** Notified whenever the merged command list changes. */
export type CommandsListener = (commands: Command[]) => void

function configToCommand(config: CommandConfig): Command {
  return {
    name: config.name,
    alias: config.alias,
    description: config.description,
    category: config.category ?? 'chat',
    requiresArgs: config.requiresArgs,
    argsPlaceholder: config.argsPlaceholder,
    isCustom: true,
    source: 'config',
    agentId: config.agentId,
    displayName: config.displayName,
    icon: config.icon,
    promptTemplate: config.promptTemplate,
  }
}

function remoteToCommand(remote: RemoteCustomCommand): Command {
  const description = remote.description?.trim()
  return {
    name: remote.command,
    description: description || remote.displayName,
    category: 'custom',
    requiresArgs: false,
    isCustom: true,
    source: 'remote',
    uid: remote.uid,
    agentId: remote.agentUid ?? undefined,
    agentName: remote.agentName ?? undefined,
    displayName: remote.displayName,
    icon: remote.icon ?? undefined,
    promptTemplate: remote.promptTemplate ?? undefined,
  }
}

/**
 * Merges built-in, config-file, and remote slash commands, notifying
 * subscribers on every change. Precedence is builtin > remote > config.
 */
export class CommandRegistry {
  private configCommands: Command[] = []
  private remoteCommands: Command[] = []
  private merged: Command[] = BUILTIN_COMMANDS
  private listeners = new Set<CommandsListener>()

  /** The merged command list. */
  getCommands(): Command[] {
    return this.merged
  }

  /** Subscribe to changes, firing immediately. Returns an unsubscribe function. */
  subscribe(listener: CommandsListener): () => void {
    this.listeners.add(listener)
    listener(this.merged)
    return () => this.listeners.delete(listener)
  }

  /** Replace the commands defined by `.workflowfiesta/commands/*.json`. */
  setConfigCommands(commands: Iterable<CommandConfig>): void {
    this.configCommands = Array.from(commands, configToCommand)
    this.remerge()
  }

  /** Replace the commands fetched from the backend. */
  setRemoteCommands(commands: readonly RemoteCustomCommand[]): void {
    this.remoteCommands = commands.filter(cmd => cmd.isActive).map(remoteToCommand)
    this.remerge()
  }

  /** Drop remote commands (e.g. on sign-out or an org switch). */
  clearRemoteCommands(): void {
    if (this.remoteCommands.length === 0) {
      return
    }
    this.remoteCommands = []
    this.remerge()
  }

  private remerge(): void {
    const byName = new Map<string, Command>()
    for (const cmd of BUILTIN_COMMANDS) {
      byName.set(cmd.name, cmd)
    }

    for (const cmd of [...this.configCommands, ...this.remoteCommands]) {
      const name = cmd.name.toLowerCase()
      if (RESERVED_COMMAND_WORDS.has(name)) {
        logger.warn(`Ignoring custom command /${cmd.name}: name is reserved by a built-in command`)
        continue
      }
      byName.set(name, { ...cmd, name })
    }

    this.merged = Array.from(byName.values())
    for (const listener of this.listeners) {
      listener(this.merged)
    }
  }
}

let registry: CommandRegistry | null = null

/** The process-wide command registry. */
export function getCommandRegistry(): CommandRegistry {
  registry ??= new CommandRegistry()
  return registry
}

/** Reset the registry (tests). */
export function resetCommandRegistry(): void {
  registry = null
}
