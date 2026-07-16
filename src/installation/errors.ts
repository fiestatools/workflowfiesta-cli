import type { InstallationMethod } from './detection'

export class UpgradeFailedError extends Error {
  override readonly name = 'UpgradeFailedError'

  constructor(
    public readonly method: InstallationMethod,
    public readonly stderr: string,
    public readonly exitCode?: number,
  ) {
    const exitInfo = exitCode !== undefined ? ` (exit code: ${exitCode})` : ''
    super(`Upgrade failed using ${method}${exitInfo}: ${stderr}`)
  }
}

export class VersionVerificationError extends Error {
  override readonly name = 'VersionVerificationError'

  constructor(
    public readonly expectedVersion: string,
    public readonly actualVersion: string,
  ) {
    super(`Version verification failed: expected ${expectedVersion}, got ${actualVersion}`)
  }
}

export class VersionFetchError extends Error {
  override readonly name = 'VersionFetchError'

  constructor(
    /** The source that was queried (e.g., 'github', 'homebrew') */
    public readonly source: string,
    public readonly reason: string,
  ) {
    super(`Failed to fetch latest version from ${source}: ${reason}`)
  }
}

export class UninstallFailedError extends Error {
  override readonly name = 'UninstallFailedError'

  constructor(
    public readonly method: InstallationMethod,
    public readonly reason: string,
    public readonly exitCode?: number,
  ) {
    const exitInfo = exitCode !== undefined ? ` (exit code: ${exitCode})` : ''
    super(`Uninstall failed using ${method}${exitInfo}: ${reason}`)
  }
}
