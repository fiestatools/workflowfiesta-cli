export type { AutoUpgradeOptions, UpdateInfo } from './autoUpgrade'

export {
  runAutoUpgradeCheck,
} from './autoUpgrade'

export {
  AUTO_UPGRADE_CHECK_DELAY_MS,
  DEFAULT_INSTALL_SCRIPT_URL,
  DISABLE_AUTOUPDATE_ENV,
  GITHUB_RELEASES_API,
  GITHUB_REPO,
  HOMEBREW_FORMULA_NAMES,
  UPGRADE_COMMAND_TIMEOUT_MS,
} from './constants'

export type { DetectionResult, InstallationMethod } from './detection'

export {
  detectInstallationMethod,
  method,
} from './detection'

export {
  UninstallFailedError,
  UpgradeFailedError,
  VersionFetchError,
  VersionVerificationError,
} from './errors'

export type { ShellConfigFile, ShellType, UninstallTargets } from './targets'

export {
  getUninstallTargets,
  getWorkflowfiestaDir,
  SHELL_CONFIG_PATTERNS,
} from './targets'

export type { UninstallOptions, UninstallResult } from './uninstall'

export {
  uninstall,
  uninstallCommand,
} from './uninstall'

export type { UpgradeOptions, UpgradeResult } from './upgrade'

export {
  upgrade,
  upgradeCommand,
} from './upgrade'

export type { ReleaseType } from './versions'

export {
  compareVersions,
  fetchLatestVersion,
  normalizeVersion,
  verifyInstalledVersion,
} from './versions'
