/**
 * Installation detection, version management, and upgrade operations.
 */

export type { AutoUpgradeOptions, UpdateInfo } from './autoUpgrade'
// Auto-upgrade
export {
  runAutoUpgradeCheck,
} from './autoUpgrade'
// Constants
export {
  AUTO_UPGRADE_CHECK_DELAY_MS,
  DEFAULT_INSTALL_SCRIPT_URL,
  DISABLE_AUTOUPDATE_ENV,
  GITHUB_RELEASES_API,
  GITHUB_REPO,
  HOMEBREW_FORMULA_NAMES,
  UPGRADE_COMMAND_TIMEOUT_MS,
} from './constants'
// Types
export type { DetectionResult, InstallationMethod } from './detection'

// Detection
export {
  detectInstallationMethod,
  method,
} from './detection'

// Errors
export {
  UpgradeFailedError,
  VersionFetchError,
  VersionVerificationError,
} from './errors'

export type { UpgradeOptions, UpgradeResult } from './upgrade'

// Upgrade
export {
  upgrade,
  upgradeCommand,
} from './upgrade'

export type { ReleaseType } from './versions'

// Versions
export {
  compareVersions,
  fetchLatestVersion,
  normalizeVersion,
  verifyInstalledVersion,
} from './versions'
