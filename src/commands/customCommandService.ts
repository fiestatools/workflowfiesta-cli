import type { ApiClient } from '../api'
import type { CommandConfig } from '../config'
import type { CommandRegistry } from './registry'
import type { RemoteCustomCommand } from './types'
import { ApiError } from '../api'
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
  private localCommands: CommandConfig[] = []

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
      const fetched = await this.api.get<RemoteCustomCommand[]>('/external/custom-commands')

      if (orgId && orgId !== this.orgId) {
        this.orgId = orgId
      }

      const published = orgId ? await this.publishLocalCommands(orgId, fetched) : []
      const commands = published.length > 0 ? [...fetched, ...published] : fetched

      this.registry.setRemoteCommands(commands)
      if (orgId) {
        this.cache.write(orgId, commands)
      }
      this.lastSyncedAt = Date.now()
      logger.debug('Custom commands synced', { count: commands.length, published: published.length, orgId })
    }
    catch (err) {
      logger.warn(`Failed to sync custom commands: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * Publish config-file commands the org doesn't have yet. A slug is only ever
   * published once per org, so deleting a command in the web app does not
   * resurrect it from a local file. Nothing is overwritten or deleted.
   */
  private async publishLocalCommands(
    orgId: string,
    remote: readonly RemoteCustomCommand[],
  ): Promise<RemoteCustomCommand[]> {
    if (this.localCommands.length === 0) {
      return []
    }

    const alreadyPublished = this.cache.readPushedSlugs(orgId)
    const remoteSlugs = new Set(remote.map(cmd => cmd.command.toLowerCase()))
    const created: RemoteCustomCommand[] = []
    const publishedSlugs: string[] = []

    for (const local of this.localCommands) {
      const slug = local.name.toLowerCase()
      if (alreadyPublished.has(slug)) {
        continue
      }
      if (remoteSlugs.has(slug)) {
        publishedSlugs.push(slug)
        continue
      }

      try {
        const command = await this.api.post<RemoteCustomCommand>('/external/custom-commands', {
          command: slug,
          displayName: local.displayName ?? local.name,
          description: local.description,
          icon: local.icon,
          agentUid: local.agentId,
          promptTemplate: local.promptTemplate,
        })
        created.push(command)
        publishedSlugs.push(slug)
        logger.info(`Published local command /${slug} to the org`)
      }
      catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          publishedSlugs.push(slug)
          continue
        }
        logger.warn(`Failed to publish local command /${slug}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    this.cache.markPushed(orgId, publishedSlugs)
    return created
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
      this.localCommands = Array.from(projectConfig.commands.values())
      this.registry.setConfigCommands(this.localCommands)
    }
    catch (err) {
      logger.warn(`Failed to load config commands: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
