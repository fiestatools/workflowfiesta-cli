import type { AuthService } from '../auth/authService'
import type { ProjectConfigResult } from './projectConfig'
import type { WorkflowfiestaConfig } from './schema'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { logger } from '../logger'
import { discoverConfigs, getGlobalConfigDir, getGlobalConfigPath } from './discovery'
import { parseJsoncOrThrow } from './jsonc'
import { deepMerge } from './merge'
import { loadProjectConfig } from './projectConfig'

const DEFAULT_API_BASE_URL = 'https://api.workflowfiesta.com'

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

/**
 * CLI configuration type alias for backwards compatibility.
 * @deprecated Use WorkflowfiestaConfig instead
 */
export type CliConfig = WorkflowfiestaConfig

/**
 * Manages CLI configuration using the new hierarchical config system.
 *
 * Configuration is loaded from multiple sources in priority order:
 * 1. Global config: ~/.config/workflowfiesta/workflowfiesta.json(c)
 * 2. Legacy config (deprecated): ~/.config/workflowfiesta/cli/config.json
 * 3. Project config: <project-root>/workflowfiesta.json(c)
 * 4. Directory configs: .workflowfiesta/workflowfiesta.json(c) walking up from CWD
 */
export class ConfigManager {
  private readonly globalConfigPath: string
  private cachedConfig: WorkflowfiestaConfig | null = null
  private cachedProjectConfig: ProjectConfigResult | null = null
  private cachedWarnings: string[] = []
  private readonly startDir: string
  private configLoadPromise: Promise<WorkflowfiestaConfig> | null = null
  private projectConfigLoadPromise: Promise<ProjectConfigResult> | null = null

  constructor(startDir?: string) {
    this.startDir = startDir ?? process.cwd()
    this.globalConfigPath = getGlobalConfigPath()

    const globalDir = getGlobalConfigDir()
    if (!existsSync(globalDir)) {
      mkdirSync(globalDir, { recursive: true, mode: 0o700 })
    }
  }

  async getConfigAsync(): Promise<WorkflowfiestaConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig
    }

    // Avoid concurrent loads
    if (this.configLoadPromise) {
      return this.configLoadPromise
    }

    this.configLoadPromise = this.loadConfig()
    try {
      return await this.configLoadPromise
    }
    finally {
      this.configLoadPromise = null
    }
  }

  private async loadConfig(): Promise<WorkflowfiestaConfig> {
    try {
      const result = await discoverConfigs(this.startDir)
      this.cachedConfig = result.merged
      this.cachedWarnings = result.warnings

      for (const warning of result.warnings) {
        logger.warn(warning)
      }

      return this.cachedConfig
    }
    catch (error) {
      logger.error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`)
      return {}
    }
  }

  /**
   * Get the full merged configuration from all sources (sync).
   * Uses cached value or returns empty config if not yet loaded.
   * Prefer getConfigAsync() for first load.
   */
  getConfig(): WorkflowfiestaConfig {
    if (this.cachedConfig) {
      return this.cachedConfig
    }

    // Start async load in background if not already loading
    if (!this.configLoadPromise) {
      this.configLoadPromise = this.loadConfig()
      this.configLoadPromise.finally(() => {
        this.configLoadPromise = null
      })
    }

    return {}
  }

  /**
   * Get the full project configuration including agents and commands (async).
   */
  async getProjectConfigAsync(): Promise<ProjectConfigResult> {
    if (this.cachedProjectConfig) {
      return this.cachedProjectConfig
    }

    // Avoid concurrent loads
    if (this.projectConfigLoadPromise) {
      return this.projectConfigLoadPromise
    }

    this.projectConfigLoadPromise = loadProjectConfig(this.startDir)
    try {
      this.cachedProjectConfig = await this.projectConfigLoadPromise
      return this.cachedProjectConfig
    }
    finally {
      this.projectConfigLoadPromise = null
    }
  }

  /**
   * Get the full project configuration including agents and commands (sync).
   * Uses cached value or returns empty result if not yet loaded.
   * @deprecated Use getProjectConfigAsync() instead
   */
  getProjectConfig(): ProjectConfigResult {
    if (this.cachedProjectConfig) {
      return this.cachedProjectConfig
    }

    if (!this.projectConfigLoadPromise) {
      this.projectConfigLoadPromise = loadProjectConfig(this.startDir)
      this.projectConfigLoadPromise
        .then((result) => {
          this.cachedProjectConfig = result
        })
        .finally(() => {
          this.projectConfigLoadPromise = null
        })
    }

    return {
      config: {},
      agents: new Map(),
      commands: new Map(),
      warnings: [],
      sourceFiles: [],
    }
  }

  getWarnings(): string[] {
    return this.cachedWarnings
  }

  /**
   * Update global configuration values (merges with existing).
   * Writes to the global config file at ~/.config/workflowfiesta/workflowfiesta.json
   */
  setConfig(updates: Partial<WorkflowfiestaConfig>): void {
    // Load current global config only (not merged)
    let current: Partial<WorkflowfiestaConfig> = {}
    if (existsSync(this.globalConfigPath)) {
      try {
        const content = readFileSync(this.globalConfigPath, 'utf-8')
        current = parseJsoncOrThrow(content, this.globalConfigPath)
      }
      catch {
        // Start fresh if current config is invalid
      }
    }

    // Deep merge updates
    const merged = deepMerge(current, updates) as WorkflowfiestaConfig

    // Ensure directory exists
    const configDir = dirname(this.globalConfigPath)
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true, mode: 0o700 })
    }

    writeFileSync(this.globalConfigPath, JSON.stringify(merged, null, 2), { mode: 0o600 })
    this.clearCache()
  }

  clearCache(): void {
    this.cachedConfig = null
    this.cachedProjectConfig = null
    this.cachedWarnings = []
  }

  getGlobalConfigPath(): string {
    return this.globalConfigPath
  }
}

let configManager: ConfigManager | undefined

export function getConfigManager(startDir?: string): ConfigManager {
  if (!configManager || startDir) {
    configManager = new ConfigManager(startDir)
  }
  return configManager
}

export function resetConfigManager(): void {
  configManager = undefined
}

export function getApiBaseUrl(): string {
  const config = getConfigManager().getConfig()
  const raw = config.apiBaseUrl?.trim() || DEFAULT_API_BASE_URL
  return raw.replace(/\/+$/, '')
}

/**
 * Create a function that returns the API base URL, checking for a session
 * override stored during sign-in (for self-hosted instances).
 *
 * Priority:
 * 1. API URL override stored during sign-in (from credential store)
 * 2. User-configured `apiBaseUrl` in config file
 * 3. Default: https://api.workflowfiesta.com
 */
export function createGetApiBaseUrl(authService: AuthService): () => Promise<string> {
  return async (): Promise<string> => {
    // Check for session-specific override first
    const override = await authService.getApiUrlOverride()
    if (override) {
      return override.replace(/\/+$/, '')
    }

    // Fall back to config or default
    return getApiBaseUrl()
  }
}

export function getRequestTimeoutMs(): number {
  const config = getConfigManager().getConfig()
  const configured = config.requestTimeoutMs
  return typeof configured === 'number' && configured > 0
    ? configured
    : DEFAULT_REQUEST_TIMEOUT_MS
}

export function createGetWsBaseUrl(authService: AuthService): () => Promise<string> {
  const getApiUrl = createGetApiBaseUrl(authService)
  return async (): Promise<string> => (await getApiUrl()).replace(/^http/, 'ws')
}

export function getConfiguredAgentId(): string | undefined {
  const config = getConfigManager().getConfig()
  return config.agentId?.trim() || undefined
}
