import type { DetectionResult, InstallationMethod } from './detection'
import { spawn } from 'node:child_process'
import { CLI_VERSION } from '../cli'
import { getConfigManager } from '../config'
import { DEFAULT_INSTALL_SCRIPT_URL, UPGRADE_COMMAND_TIMEOUT_MS } from './constants'
import { detectInstallationMethod } from './detection'
import { UpgradeFailedError } from './errors'
import { fetchLatestVersion, normalizeVersion } from './versions'

export interface UpgradeOptions {
  /** Target version to upgrade to. If not provided, upgrades to latest. */
  target?: string
  /** Force a specific installation method. */
  forceMethod?: InstallationMethod
  /** Callback for progress messages */
  onProgress?: (message: string) => void
}

export interface UpgradeResult {
  /** Whether the upgrade was successful */
  success: boolean
  /** The method used for upgrading */
  method: InstallationMethod
  /** Version before upgrade */
  fromVersion: string
  /** Version after upgrade (or target version if successful) */
  toVersion: string
  /** Whether the upgrade was skipped (already on target version) */
  skipped: boolean
}

function getInstallScriptUrl(): string {
  const config = getConfigManager().getConfig()
  return config.installScriptUrl?.trim() || DEFAULT_INSTALL_SCRIPT_URL
}

async function execCommand(
  command: string,
  args: string[],
  env?: Record<string, string>,
): Promise<{ stdout: string, stderr: string, exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, ...env },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      resolve({ stdout, stderr: error.message, exitCode: 1 })
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })

    // Timeout
    setTimeout(() => {
      proc.kill()
      resolve({ stdout, stderr: 'Command timed out', exitCode: 124 })
    }, UPGRADE_COMMAND_TIMEOUT_MS)
  })
}

async function upgradeCurl(
  targetVersion: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  const scriptUrl = getInstallScriptUrl()

  onProgress?.(`Downloading install script from ${scriptUrl}...`)

  const curlResult = await execCommand('curl', ['-fsSL', scriptUrl])
  if (curlResult.exitCode !== 0) {
    throw new UpgradeFailedError('curl', `Failed to download install script: ${curlResult.stderr}`, curlResult.exitCode)
  }

  onProgress?.('Running install script...')

  const bashResult = await execCommand('bash', ['-c', curlResult.stdout], {
    VERSION: targetVersion,
  })

  if (bashResult.exitCode !== 0) {
    throw new UpgradeFailedError('curl', bashResult.stderr || bashResult.stdout, bashResult.exitCode)
  }

  onProgress?.('Install script completed.')
}

async function upgradeBrew(
  detection: DetectionResult,
  _targetVersion: string,
  onProgress?: (message: string) => void,
): Promise<void> {
  const formula = detection.brewFormula || 'workflowfiesta'
  const env = { HOMEBREW_NO_AUTO_UPDATE: '1' }

  // Handle tapped formulas (e.g., "fiestatools/tap/wf")
  if (formula.includes('/')) {
    // Extract tap name (e.g., "fiestatools/tap" from "fiestatools/tap/wf")
    const parts = formula.split('/')
    const tap = parts.slice(0, 2).join('/')

    onProgress?.(`Ensuring tap ${tap} is installed...`)

    const tapResult = await execCommand('brew', ['tap', tap], env)
    if (tapResult.exitCode !== 0) {
      throw new UpgradeFailedError('brew', `Failed to tap ${tap}: ${tapResult.stderr}`, tapResult.exitCode)
    }

    // Get the tap repo directory and pull latest
    const repoResult = await execCommand('brew', ['--repo', tap], env)
    const repoDir = repoResult.stdout.trim()

    if (repoDir && repoResult.exitCode === 0) {
      onProgress?.('Pulling latest tap updates...')

      const pullResult = await execCommand('git', ['-C', repoDir, 'pull', '--ff-only'], env)
      if (pullResult.exitCode !== 0) {
        throw new UpgradeFailedError('brew', `Failed to update tap repo: ${pullResult.stderr}`, pullResult.exitCode)
      }
    }
  }

  onProgress?.(`Upgrading ${formula}...`)

  const upgradeResult = await execCommand('brew', ['upgrade', formula], env)

  if (upgradeResult.exitCode !== 0) {
    // Check if it's already up to date (brew upgrade returns non-zero if already latest)
    if (upgradeResult.stderr.includes('already installed') || upgradeResult.stdout.includes('already installed')) {
      onProgress?.('Already on latest version.')
      return
    }
    throw new UpgradeFailedError('brew', upgradeResult.stderr || upgradeResult.stdout, upgradeResult.exitCode)
  }

  onProgress?.('Homebrew upgrade completed.')
}

/**
 * Execute the upgrade to the target version.
 *
 * @param options - Upgrade options
 * @returns Result of the upgrade operation
 */
export async function upgrade(options: UpgradeOptions = {}): Promise<UpgradeResult> {
  const { target, forceMethod, onProgress } = options

  const detection = await detectInstallationMethod()
  const method = forceMethod ?? (detection.method === 'unknown' ? 'curl' : detection.method)

  onProgress?.(`Using upgrade method: ${method}`)

  const targetVersion = target ? normalizeVersion(target) : await fetchLatestVersion(method)
  const currentVersion = normalizeVersion(CLI_VERSION)

  onProgress?.(`Upgrading from ${currentVersion} --> ${targetVersion}`)

  if (currentVersion === targetVersion) {
    return {
      success: true,
      method,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      skipped: true,
    }
  }

  switch (method) {
    case 'brew':
      await upgradeBrew(detection, targetVersion, onProgress)
      break
    case 'curl':
    default:
      await upgradeCurl(targetVersion, onProgress)
      break
  }

  return {
    success: true,
    method,
    fromVersion: currentVersion,
    toVersion: targetVersion,
    skipped: false,
  }
}

/**
 * CLI command handler for `wf upgrade`.
 */
export async function upgradeCommand(options: {
  target?: string
  forceMethod?: 'curl' | 'brew'
}): Promise<void> {
  const { target, forceMethod } = options

  try {
    const result = await upgrade({
      target,
      forceMethod,
      onProgress: (message) => {
        console.log(message) // eslint-disable-line no-console -- CLI output
      },
    })

    if (result.skipped) {
      console.log(`\nAlready on version ${result.toVersion}`) // eslint-disable-line no-console -- CLI output
    }
    else {
      console.log('\nUpgrade complete') // eslint-disable-line no-console -- CLI output
    }
  }
  catch (error) {
    if (error instanceof UpgradeFailedError) {
      console.error(`\nUpgrade failed: ${error.message}`)
      if (error.stderr) {
        console.error(error.stderr)
      }
    }
    else {
      console.error(`\nUpgrade failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    process.exit(1)
  }
}
