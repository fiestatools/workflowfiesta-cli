import type { WorkflowfiestaConfig } from './schema'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { findUp, findUpMultiple } from 'find-up'
import { parseJsoncOrThrow } from './jsonc'
import { deepMergeAll } from './merge'
import { validateConfigOrThrow } from './schema'

export const CONFIG_FILE_NAMES = ['workflowfiesta.json', 'workflowfiesta.jsonc'] as const

/** Legacy config file name (deprecated). */
export const LEGACY_CONFIG_FILE_NAME = 'config.json'

export const CONFIG_DIR_NAME = '.workflowfiesta'

/**
 * Types of config sources.
 */
export type ConfigSourceType = 'global' | 'project' | 'directory' | 'legacy'

/**
 * Represents a discovered configuration source.
 */
export interface ConfigSource {
  /** Absolute path to the config file. */
  path: string
  /** Type of config source. */
  type: ConfigSourceType
  /** The loaded configuration. */
  config: Partial<WorkflowfiestaConfig>
  /** Whether this is a deprecated legacy config. */
  isLegacy?: boolean
}

/**
 * Result of configuration discovery.
 */
export interface DiscoveryResult {
  /** All discovered config sources, in priority order (lowest to highest). */
  sources: ConfigSource[]
  /** The merged configuration from all sources. */
  merged: WorkflowfiestaConfig
  /** Warnings about deprecated configs, parse errors, etc. */
  warnings: string[]
}

/**
 * Get the global configuration directory path.
 * Uses XDG_CONFIG_HOME if set, otherwise defaults to ~/.config/workflowfiesta
 */
export function getGlobalConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(xdgConfig, 'workflowfiesta')
}

/**
 * Get the legacy global configuration directory path.
 * This is the old location: ~/.config/workflowfiesta/cli/
 */
export function getLegacyGlobalConfigDir(): string {
  return join(homedir(), '.config', 'workflowfiesta', 'cli')
}

/**
 * Find a config file in a directory.
 * Searches for workflowfiesta.json, then workflowfiesta.jsonc.
 *
 * @param dir - Directory to search in
 * @returns Path to the config file if found, undefined otherwise
 */
export function findConfigFile(dir: string): string | undefined {
  for (const name of CONFIG_FILE_NAMES) {
    const filePath = join(dir, name)
    if (existsSync(filePath)) {
      return filePath
    }
  }
  return undefined
}

/**
 * Find .workflowfiesta directories by walking up from the start directory.
 * Returns directories in order from most distant (lowest priority) to closest (highest priority).
 *
 * @param startDir - Directory to start walking from
 * @returns Array of .workflowfiesta directory paths
 */
export async function findWorkflowfiestaDirectories(startDir: string): Promise<string[]> {
  const directories = await findUpMultiple(CONFIG_DIR_NAME, {
    cwd: startDir,
    type: 'directory',
  })

  // findUpMultiple returns closest first, we want most distant first (lowest priority)
  return directories.reverse()
}

/**
 * Find the project root directory.
 * Walks up from startDir looking for common project indicators.
 *
 * @param startDir - Directory to start searching from
 * @returns Project root directory if found, undefined otherwise
 */
export async function findProjectRoot(startDir: string): Promise<string | undefined> {
  const projectIndicators = [
    'package.json',
    '.git',
    'Cargo.toml',
    'go.mod',
    'pyproject.toml',
    'composer.json',
    'Gemfile',
    CONFIG_DIR_NAME,
    ...CONFIG_FILE_NAMES,
  ]

  const found = await findUp(projectIndicators, {
    cwd: startDir,
    type: 'file',
    allowSymlinks: true,
  })

  // Also check for directories like .git and .workflowfiesta
  const foundDir = await findUp(['.git', CONFIG_DIR_NAME], {
    cwd: startDir,
    type: 'directory',
  })

  // Return the closest match (highest in the tree)
  if (found && foundDir) {
    // Compare depths - return the one closest to startDir
    const foundDepth = found.split('/').length
    const foundDirDepth = foundDir.split('/').length
    return dirname(foundDepth >= foundDirDepth ? found : foundDir)
  }

  if (found) {
    return dirname(found)
  }

  if (foundDir) {
    return dirname(foundDir)
  }

  return undefined
}

/**
 * Load a config file from disk.
 *
 * @param filePath - Path to the config file
 * @returns Parsed configuration
 * @throws Error if file cannot be read or parsed
 */
export function loadConfigFile(filePath: string): Partial<WorkflowfiestaConfig> {
  const content = readFileSync(filePath, 'utf-8')

  // Use JSONC parser for both .json and .jsonc (comments are allowed in both)
  const parsed = parseJsoncOrThrow(content, filePath)

  // Validate the parsed config
  return validateConfigOrThrow(parsed, filePath)
}

/**
 * Discover and load all configuration files.
 *
 * Priority order (lowest to highest):
 * 1. Global config: ~/.config/workflowfiesta/workflowfiesta.json(c)
 * 2. Legacy global config (deprecated): ~/.config/workflowfiesta/cli/config.json
 * 3. Project-level config: <project-root>/workflowfiesta.json(c)
 * 4. Directory configs: .workflowfiesta/workflowfiesta.json(c) walking up from startDir
 *
 * @param startDir - Directory to start discovery from (usually process.cwd())
 * @returns Discovery result with all sources, merged config, and warnings
 */
export async function discoverConfigs(startDir: string): Promise<DiscoveryResult> {
  const sources: ConfigSource[] = []
  const warnings: string[] = []

  const globalDir = getGlobalConfigDir()
  const globalConfigPath = findConfigFile(globalDir)
  if (globalConfigPath) {
    try {
      const config = loadConfigFile(globalConfigPath)
      sources.push({
        path: globalConfigPath,
        type: 'global',
        config,
      })
    }
    catch (error) {
      warnings.push(`Failed to load global config (${globalConfigPath}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const legacyDir = getLegacyGlobalConfigDir()
  const legacyConfigPath = join(legacyDir, LEGACY_CONFIG_FILE_NAME)
  if (existsSync(legacyConfigPath)) {
    try {
      const content = readFileSync(legacyConfigPath, 'utf-8')
      const config = JSON.parse(content) as Partial<WorkflowfiestaConfig>
      sources.push({
        path: legacyConfigPath,
        type: 'legacy',
        config,
        isLegacy: true,
      })
      warnings.push(
        `Deprecated: ${legacyConfigPath} will be removed in a future version. `
        + `Please migrate to ${join(globalDir, 'workflowfiesta.json')}`,
      )
    }
    catch (error) {
      warnings.push(`Failed to load legacy config (${legacyConfigPath}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const projectRoot = await findProjectRoot(startDir)
  if (projectRoot) {
    const projectConfigPath = findConfigFile(projectRoot)
    if (projectConfigPath) {
      try {
        const config = loadConfigFile(projectConfigPath)
        sources.push({
          path: projectConfigPath,
          type: 'project',
          config,
        })
      }
      catch (error) {
        warnings.push(`Failed to load project config (${projectConfigPath}): ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const wfDirectories = await findWorkflowfiestaDirectories(startDir)
  for (const wfDir of wfDirectories) {
    const dirConfigPath = findConfigFile(wfDir)
    if (dirConfigPath) {
      try {
        const config = loadConfigFile(dirConfigPath)
        sources.push({
          path: dirConfigPath,
          type: 'directory',
          config,
        })
      }
      catch (error) {
        warnings.push(`Failed to load directory config (${dirConfigPath}): ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  // Merge all configs in order
  const configs = sources.map(s => s.config)
  const merged = deepMergeAll<WorkflowfiestaConfig>({}, ...configs)

  return {
    sources,
    merged,
    warnings,
  }
}

/**
 * List files in a .workflowfiesta subdirectory.
 * Used to find agent configs, commands, etc.
 *
 * @param wfDir - The .workflowfiesta directory path
 * @param subdir - The subdirectory name (e.g., 'agents', 'commands')
 * @returns Array of file paths
 */
export function listConfigSubdirFiles(wfDir: string, subdir: string): string[] {
  const subdirPath = join(wfDir, subdir)
  if (!existsSync(subdirPath) || !statSync(subdirPath).isDirectory()) {
    return []
  }

  return readdirSync(subdirPath)
    .filter(file => file.endsWith('.json') || file.endsWith('.jsonc'))
    .map(file => join(subdirPath, file))
}

/**
 * Get the preferred path for writing global config.
 * Creates the directory if it doesn't exist.
 *
 * @returns Path to the global config file
 */
export function getGlobalConfigPath(): string {
  return join(getGlobalConfigDir(), CONFIG_FILE_NAMES[0])
}
