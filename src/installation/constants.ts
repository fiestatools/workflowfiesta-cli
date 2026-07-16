export const GITHUB_REPO = 'fiestatools/workflowfiesta-cli'

export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

/**
 * Default install script URL for curl-based upgrades.
 * Can be overridden via `installScriptUrl` in config.
 */
export const DEFAULT_INSTALL_SCRIPT_URL
  = 'https://raw.githubusercontent.com/fiestatools/workflowfiesta-cli/refs/heads/main/scripts/install.sh'

/** Homebrew formula names to check, in priority order (tapped first, then core) */
export const HOMEBREW_TAP_FORMULA = 'fiestatools/tap/wf'
export const HOMEBREW_CORE_FORMULA = 'wf'
export const HOMEBREW_FORMULA_NAMES = [HOMEBREW_TAP_FORMULA, HOMEBREW_CORE_FORMULA] as const

export const DISABLE_AUTOUPDATE_ENV = 'WF_DISABLE_AUTOUPDATE'

export const AUTO_UPGRADE_CHECK_DELAY_MS = 1_000

export const UPGRADE_COMMAND_TIMEOUT_MS = 120_000

export const DEFAULT_INSTALL_DIR = '$HOME/.workflowfiesta/bin'
