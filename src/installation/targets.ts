import type { InstallationMethod } from './detection'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { getGlobalConfigDir, getLegacyGlobalConfigDir } from '../config'

export type ShellType = 'bash' | 'zsh' | 'fish' | 'sh'

export interface ShellConfigFile {
  /** Absolute path to the shell config file */
  path: string
  /** Shell type for this config */
  shell: ShellType
}

export interface UninstallTargets {
  /** New config directory (~/.config/workflowfiesta/) */
  configDir: string

  /** Legacy config directory (~/.config/workflowfiesta/cli/) - for migration */
  legacyConfigDir: string

  /** Data file path (conversations.json) - kept if --keep-data */
  dataFile: string

  /** Binary directory (curl install only, e.g., ~/.workflowfiesta/bin/) */
  binaryDir: string | null

  /** Binary path (e.g., ~/.workflowfiesta/bin/wf) */
  binaryPath: string | null

  /** Shell config files that exist and may have PATH modifications */
  shellConfigs: ShellConfigFile[]
}

export const SHELL_CONFIG_PATTERNS = [
  /^# workflowfiesta\s*$/,
  /export PATH=.*\.workflowfiesta\/bin/,
  /fish_add_path.*\.workflowfiesta/,
]

function getAllShellConfigPaths(): ShellConfigFile[] {
  const home = homedir()
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, '.config')
  const zdotdir = process.env.ZDOTDIR || home

  return [
    { path: join(home, '.bashrc'), shell: 'bash' as const },
    { path: join(home, '.bash_profile'), shell: 'bash' as const },
    { path: join(home, '.profile'), shell: 'bash' as const },
    { path: join(xdgConfig, 'bash', '.bashrc'), shell: 'bash' as const },
    { path: join(xdgConfig, 'bash', '.bash_profile'), shell: 'bash' as const },
    // zsh
    { path: join(zdotdir, '.zshrc'), shell: 'zsh' as const },
    { path: join(zdotdir, '.zshenv'), shell: 'zsh' as const },
    { path: join(xdgConfig, 'zsh', '.zshrc'), shell: 'zsh' as const },
    { path: join(xdgConfig, 'zsh', '.zshenv'), shell: 'zsh' as const },
    // fish
    { path: join(xdgConfig, 'fish', 'config.fish'), shell: 'fish' as const },
    // sh/ash (POSIX shells)
    { path: join(home, '.ashrc'), shell: 'sh' as const },
  ]
}

function getExistingShellConfigs(): ShellConfigFile[] {
  return getAllShellConfigPaths().filter(config => existsSync(config.path))
}

function getBinaryPaths(
  method: InstallationMethod,
  execPath: string,
): { binaryDir: string | null, binaryPath: string | null } {
  if (method !== 'curl') {
    return { binaryDir: null, binaryPath: null }
  }

  const home = homedir()
  const defaultBinaryDir = join(home, '.workflowfiesta', 'bin')
  const defaultBinaryPath = join(defaultBinaryDir, 'wf')

  // Check if execPath is within the expected curl install location
  if (execPath.includes('.workflowfiesta')) {
    return {
      binaryDir: dirname(execPath),
      binaryPath: execPath,
    }
  }

  // Fall back to default location if it exists
  if (existsSync(defaultBinaryPath)) {
    return {
      binaryDir: defaultBinaryDir,
      binaryPath: defaultBinaryPath,
    }
  }

  return {
    binaryDir: defaultBinaryDir,
    binaryPath: defaultBinaryPath,
  }
}

/**
 * Get all uninstall targets based on the installation method.
 *
 * @param method - The detected installation method
 * @param execPath - Path to the current executable
 * @returns Targets to be removed/cleaned during uninstall
 */
export function getUninstallTargets(
  method: InstallationMethod,
  execPath: string,
): UninstallTargets {
  const configDir = getGlobalConfigDir()
  const legacyConfigDir = getLegacyGlobalConfigDir()
  const dataFile = join(legacyConfigDir, 'conversations.json')
  const { binaryDir, binaryPath } = getBinaryPaths(method, execPath)
  const shellConfigs = getExistingShellConfigs()

  return {
    configDir,
    legacyConfigDir,
    dataFile,
    binaryDir,
    binaryPath,
    shellConfigs,
  }
}

/**
 * Get the parent workflowfiesta directory for curl installs.
 * This is the directory that contains the bin/ folder.
 */
export function getWorkflowfiestaDir(): string {
  return join(homedir(), '.workflowfiesta')
}
