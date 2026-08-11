import type { ApiClient } from '../api'
import type { CommandRegistry } from './registry'
import type { RemoteCustomCommand } from './types'
import { getConfigManager } from '../config'
import { CUSTOM_COMMAND_SYNC_TTL_MS } from '../constants'
import { logger } from '../logger'
import { getCommandRegistry } from './registry'
import { RemoteCommandCache } from './remoteCommandCache'

interface MeOrgResponse {
  orgId: string
}

export interface CustomCommandServiceOptions {
  registry?: CommandRegistry
  cache?: RemoteCommandCache
}

/** Keeps the command registry's config-file and remote layers up to date. */
export class CustomCommandService {
  private readonly registry: CommandRegistry
  private readonly cache: RemoteCommandCache
  private syncPromise: Promise<void> | null = null
  private orgId?: string
  private lastSyncedAt = 0

  constructor(
    private readonly api: ApiClient,
    options: CustomCommandServiceOptions = {},
  ) {
    this.registry = options.registry ?? getCommandRegistry()
    this.cache = options.cache ?? new RemoteCommandCache()
  }

  /** Populate the registry from config files and the cache, without the network. */
  async loadLocal(): Promise<void> {
    const cached = this.cache.readLast()
    if (cached) {
      this.orgId = cached.orgId
      this.registry.setRemoteCommands(cached.commands)
    }

    await this.loadConfigCommands()
  }

  /** Fetch the org's commands. Concurrent callers share one request; never throws. */
  async sync(): Promise<void> {
    this.syncPromise ??= this.runSync().finally(() => {
      this.syncPromise = null
    })
    return this.syncPromise
  }

  /** Sync only when the last success is older than `maxAgeMs`. */
  async refreshIfStale(maxAgeMs = CUSTOM_COMMAND_SYNC_TTL_MS): Promise<void> {
    if (this.syncPromise) {
      return this.syncPromise
    }
    if (Date.now() - this.lastSyncedAt < maxAgeMs) {
      return
    }
    return this.sync()
  }

  /**
   * Re-resolve the org and refetch, dropping the previous account's commands.
   * Called when the active account changes, so one org's palette and cache
   * never carry over to another.
   */
  async reload(): Promise<void> {
    this.orgId = undefined
    this.lastSyncedAt = 0
    this.registry.clearRemoteCommands()
    await this.sync()
  }

  /** Drop remote commands and cached lists (on sign-out). */
  clear(): void {
    this.orgId = undefined
    this.lastSyncedAt = 0
    this.registry.clearRemoteCommands()
    this.cache.clear()
  }

  /** Number of custom commands currently registered. */
  countCustomCommands(): number {
    return this.registry.getCommands().filter(cmd => cmd.isCustom).length
  }

  private async runSync(): Promise<void> {
    try {
      const orgId = await this.resolveOrgId()
      const commands = await this.api.get<RemoteCustomCommand[]>('/external/custom-commands')

      if (orgId && orgId !== this.orgId) {
        this.orgId = orgId
      }

      this.registry.setRemoteCommands(commands)
      if (orgId) {
        this.cache.write(orgId, commands)
      }
      this.lastSyncedAt = Date.now()
      logger.debug('Custom commands synced', { count: commands.length, orgId })
    }
    catch (err) {
      logger.warn(`Failed to sync custom commands: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async resolveOrgId(): Promise<string | undefined> {
    if (this.orgId) {
      return this.orgId
    }
    try {
      const me = await this.api.get<MeOrgResponse>('/external/me')
      this.orgId = me.orgId
      return this.orgId
    }
    catch (err) {
      logger.warn(`Failed to resolve org for command cache: ${err instanceof Error ? err.message : String(err)}`)
      return undefined
    }
  }

  private async loadConfigCommands(): Promise<void> {
    try {
      const projectConfig = await getConfigManager().getProjectConfigAsync()
      this.registry.setConfigCommands(projectConfig.commands.values())
    }
    catch (err) {
      logger.warn(`Failed to load config commands: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
