import type { AuthService } from '../auth/authService'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Fallback when the user has not configured a backend URL. */
const DEFAULT_API_BASE_URL = 'https://api.workflowfiesta.com'

/** Fallback request timeout. */
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

/**
 * CLI configuration schema.
 */
export interface CliConfig {
  /** Base URL of the WorkflowFiesta backend API. */
  apiBaseUrl?: string
  /** Timeout in milliseconds for API requests. */
  requestTimeoutMs?: number
  /** UID of the agent to use. Leave empty for org's first agent. */
  agentId?: string
}

/**
 * Manages CLI configuration stored in `~/.config/workflowfiesta/cli/config.json`.
 */
export class ConfigManager {
  private readonly configPath: string
  private cachedConfig: CliConfig | null = null

  constructor(configDir?: string) {
    const baseDir = configDir ?? join(homedir(), '.config', 'workflowfiesta', 'cli')
    this.configPath = join(baseDir, 'config.json')

    // Ensure the config directory exists
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true, mode: 0o700 })
    }
  }

  /** Get the full configuration, with defaults applied. */
  getConfig(): CliConfig {
    if (this.cachedConfig) {
      return this.cachedConfig
    }

    if (!existsSync(this.configPath)) {
      return {}
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8')
      this.cachedConfig = JSON.parse(content) as CliConfig
      return this.cachedConfig
    }
    catch {
      return {}
    }
  }

  /** Update configuration values (merges with existing). */
  setConfig(updates: Partial<CliConfig>): void {
    const current = this.getConfig()
    const merged = { ...current, ...updates }
    writeFileSync(this.configPath, JSON.stringify(merged, null, 2), { mode: 0o600 })
    this.cachedConfig = merged
  }

  /** Clear the cached config to force a re-read. */
  clearCache(): void {
    this.cachedConfig = null
  }
}

/** Global config manager instance. */
let configManager: ConfigManager | undefined

/** Get or create the global config manager. */
export function getConfigManager(): ConfigManager {
  configManager ??= new ConfigManager()
  return configManager
}

/**
 * Base URL of the WorkflowFiesta backend, without a trailing slash.
 *
 * Read fresh on every call so changes take effect without restarting.
 * API paths are always joined as `${baseUrl}/api/...`.
 */
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

/** Per-request timeout in milliseconds. Falls back to the default on invalid input. */
export function getRequestTimeoutMs(): number {
  const config = getConfigManager().getConfig()
  const configured = config.requestTimeoutMs
  return typeof configured === 'number' && configured > 0
    ? configured
    : DEFAULT_REQUEST_TIMEOUT_MS
}

/**
 * Create a function that returns the WebSocket base URL for run-event streaming,
 * derived from the resolved API base URL (`http`→`ws`, `https`→`wss`), without a
 * trailing slash. The stream endpoint is joined as `${wsBaseUrl}/ws`.
 */
export function createGetWsBaseUrl(authService: AuthService): () => Promise<string> {
  const getApiUrl = createGetApiBaseUrl(authService)
  return async (): Promise<string> => (await getApiUrl()).replace(/^http/, 'ws')
}

/**
 * Agent the CLI runs, if pinned via `agentId` config.
 * When empty, the run service falls back to the org's first agent.
 */
export function getConfiguredAgentId(): string | undefined {
  const config = getConfigManager().getConfig()
  return config.agentId?.trim() || undefined
}
