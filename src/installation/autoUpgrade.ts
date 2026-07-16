import type { CliConfig } from '../config/settings'
import type { ReleaseType } from './versions'
import { logger } from '../logger'
import { DISABLE_AUTOUPDATE_ENV } from './constants'
import { detectInstallationMethod } from './detection'
import { upgrade } from './upgrade'
import { compareVersions, fetchLatestVersion, normalizeVersion } from './versions'

export interface UpdateInfo {
  /** Current installed version */
  currentVersion: string
  /** Latest available version */
  latestVersion: string
  /** Type of release (patch, minor, major) */
  releaseType: ReleaseType
}

export interface AutoUpgradeOptions {
  /** Current installed CLI version */
  currentVersion: string
  /** Function to get the current config */
  getConfig: () => CliConfig
  /** Callback when a non-patch update is available (for notification) */
  onUpdateAvailable?: (info: UpdateInfo) => void
  /** Callback when a patch was auto-installed */
  onPatchInstalled?: (newVersion: string) => void
  /** Callback on error (for logging) */
  onError?: (error: Error) => void
}

function isAutoUpdateDisabled(config: CliConfig): boolean {
  const envDisabled = process.env[DISABLE_AUTOUPDATE_ENV]
  if (envDisabled && envDisabled !== '0' && envDisabled.toLowerCase() !== 'false') {
    return true
  }

  return config.autoupdate === false
}

function isNotifyOnly(config: CliConfig): boolean {
  return config.autoupdate === 'notify'
}

export async function runAutoUpgradeCheck(options: AutoUpgradeOptions): Promise<void> {
  const {
    currentVersion,
    getConfig,
    onUpdateAvailable,
    onPatchInstalled,
    onError,
  } = options

  try {
    const config = getConfig()

    if (isAutoUpdateDisabled(config)) {
      logger.debug('Auto-update is disabled')
      return
    }

    const detection = await detectInstallationMethod()
    const method = detection.method === 'unknown' ? 'curl' : detection.method

    const latestVersion = await fetchLatestVersion(method)
    const normalizedCurrent = normalizeVersion(currentVersion)
    const normalizedLatest = normalizeVersion(latestVersion)

    const releaseType = compareVersions(normalizedCurrent, normalizedLatest)

    logger.debug('Auto-upgrade check', {
      current: normalizedCurrent,
      latest: normalizedLatest,
      releaseType,
    })

    // Nothing to do if same or older
    if (releaseType === 'same' || releaseType === 'older') {
      return
    }

    const updateInfo: UpdateInfo = {
      currentVersion: normalizedCurrent,
      latestVersion: normalizedLatest,
      releaseType,
    }

    // For patches, auto-install unless notify-only
    if (releaseType === 'patch' && !isNotifyOnly(config)) {
      logger.info('Auto-installing patch update', { version: normalizedLatest })

      try {
        await upgrade({
          target: normalizedLatest,
          // Don't show progress for background upgrades
        })

        // Notify that patch was installed
        onPatchInstalled?.(normalizedLatest)
        logger.info('Patch update installed', { version: normalizedLatest })
      }
      catch (upgradeError) {
        logger.warn('Auto-upgrade failed', { error: upgradeError })
        // Fall back to notification instead
        onUpdateAvailable?.(updateInfo)
      }
      return
    }

    // For minor/major or notify-only: just notify
    onUpdateAvailable?.(updateInfo)
  }
  catch (error) {
    logger.debug('Auto-upgrade check failed', { error })
    onError?.(error instanceof Error ? error : new Error(String(error)))
  }
}
