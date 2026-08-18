import type { RemoteCustomCommand } from './types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logger } from '../logger'

interface CacheOrgEntry {
  fetchedAt: string
  commands: RemoteCustomCommand[]
  pushedSlugs?: string[]
}

interface CacheFile {
  version: 1
  lastOrgId?: string
  orgs: Record<string, CacheOrgEntry>
}

const EMPTY_CACHE: CacheFile = { version: 1, orgs: {} }

/**
 * Persists custom commands to `~/.config/workflowfiesta/cli/commands.json`,
 * keyed by org uid so a switched account never inherits another org's palette.
 */
export class RemoteCommandCache {
  private readonly filePath: string
  private cache: CacheFile | null = null

  constructor(configDir?: string) {
    const baseDir = configDir ?? join(homedir(), '.config', 'workflowfiesta', 'cli')
    this.filePath = join(baseDir, 'commands.json')
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true, mode: 0o700 })
    }
  }

  /** Cached commands for an org, or an empty list when nothing is stored. */
  read(orgId: string): RemoteCustomCommand[] {
    return this.load().orgs[orgId]?.commands ?? []
  }

  /** Commands for the most recently synced org, before `/external/me` resolves. */
  readLast(): { orgId: string, commands: RemoteCustomCommand[] } | undefined {
    const cache = this.load()
    const orgId = cache.lastOrgId
    if (!orgId) {
      return undefined
    }
    return { orgId, commands: cache.orgs[orgId]?.commands ?? [] }
  }

  /** Slugs already published to an org from local config files. */
  readPushedSlugs(orgId: string): Set<string> {
    return new Set(this.load().orgs[orgId]?.pushedSlugs ?? [])
  }

  /** Record slugs as published so they are never pushed to this org again. */
  markPushed(orgId: string, slugs: readonly string[]): void {
    if (slugs.length === 0) {
      return
    }
    const cache = this.load()
    const entry = cache.orgs[orgId] ?? { fetchedAt: new Date().toISOString(), commands: [] }
    entry.pushedSlugs = [...new Set([...(entry.pushedSlugs ?? []), ...slugs])]
    cache.orgs[orgId] = entry
    this.persist(cache)
  }

  /** Replace the cached commands for an org, preserving its pushed slugs. */
  write(orgId: string, commands: RemoteCustomCommand[]): void {
    const cache = this.load()
    const pushedSlugs = cache.orgs[orgId]?.pushedSlugs
    cache.orgs[orgId] = { fetchedAt: new Date().toISOString(), commands, pushedSlugs }
    cache.lastOrgId = orgId
    this.persist(cache)
  }

  /** Forget every cached org (e.g. on sign-out). */
  clear(): void {
    this.persist({ ...EMPTY_CACHE, orgs: {} })
  }

  private load(): CacheFile {
    if (this.cache) {
      return this.cache
    }
    if (!existsSync(this.filePath)) {
      this.cache = { ...EMPTY_CACHE, orgs: {} }
      return this.cache
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf-8')) as CacheFile
      this.cache = parsed?.version === 1 && parsed.orgs ? parsed : { ...EMPTY_CACHE, orgs: {} }
    }
    catch (err) {
      logger.warn(`Failed to read command cache: ${err instanceof Error ? err.message : String(err)}`)
      this.cache = { ...EMPTY_CACHE, orgs: {} }
    }
    return this.cache
  }

  private persist(cache: CacheFile): void {
    this.cache = cache
    try {
      writeFileSync(this.filePath, JSON.stringify(cache, null, 2), { mode: 0o600 })
    }
    catch (err) {
      logger.warn(`Failed to write command cache: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
