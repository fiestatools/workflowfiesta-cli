import type { ChildProcess } from 'node:child_process'
import type { InstallationMethod } from './detection'
import { spawn } from 'node:child_process'
import * as semver from 'semver'
import { GITHUB_RELEASES_API, HOMEBREW_CORE_FORMULA, HOMEBREW_TAP_FORMULA } from './constants'
import { VersionFetchError } from './errors'

export type ReleaseType = 'patch' | 'minor' | 'major' | 'same' | 'older'

/** Homebrew formula names to try, in priority order */
const HOMEBREW_FORMULAS = [HOMEBREW_TAP_FORMULA, HOMEBREW_CORE_FORMULA] as const

export function normalizeVersion(version: string): string {
  return version.replace(/^v/, '').trim()
}

/**
 * Compare two semver versions and determine the release type.
 *
 * @param current - Current installed version
 * @param latest - Latest available version
 * @returns The type of release change, or 'same'/'older'
 */
export function compareVersions(current: string, latest: string): ReleaseType {
  const currentNormalized = normalizeVersion(current)
  const latestNormalized = normalizeVersion(latest)

  if (!semver.valid(currentNormalized) || !semver.valid(latestNormalized)) {
    return currentNormalized === latestNormalized ? 'same' : 'major'
  }

  const comparison = semver.compare(latestNormalized, currentNormalized)

  if (comparison === 0) {
    return 'same'
  }

  if (comparison < 0) {
    return 'older'
  }

  const currentMajor = semver.major(currentNormalized)
  const currentMinor = semver.minor(currentNormalized)
  const latestMajor = semver.major(latestNormalized)
  const latestMinor = semver.minor(latestNormalized)

  if (latestMajor > currentMajor) {
    return 'major'
  }
  if (latestMinor > currentMinor) {
    return 'minor'
  }
  return 'patch'
}

async function fetchLatestFromGitHub(): Promise<string> {
  try {
    const response = await fetch(GITHUB_RELEASES_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'workflowfiesta-cli',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json() as { tag_name?: string }
    if (!data.tag_name) {
      throw new Error('No tag_name in response')
    }

    return normalizeVersion(data.tag_name)
  }
  catch (error) {
    throw new VersionFetchError(
      'github',
      error instanceof Error ? error.message : String(error),
    )
  }
}

/**
 * Fetch the latest version from Homebrew.
 */
async function fetchLatestFromHomebrew(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try each formula name
    const tryFormula = async (index: number): Promise<void> => {
      if (index >= HOMEBREW_FORMULAS.length) {
        // Fall back to GitHub if no formula found
        try {
          const version = await fetchLatestFromGitHub()
          resolve(version)
        }
        catch (error) {
          reject(error)
        }
        return
      }

      const formula = HOMEBREW_FORMULAS[index]!
      const proc: ChildProcess = spawn('brew', ['info', '--json=v2', formula], {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.on('error', () => {
        void tryFormula(index + 1)
      })

      proc.on('close', (code: number | null) => {
        if (code !== 0) {
          void tryFormula(index + 1)
          return
        }

        try {
          const data = JSON.parse(stdout) as {
            formulae?: Array<{ versions?: { stable?: string } }>
          }
          const version = data.formulae?.[0]?.versions?.stable
          if (version) {
            resolve(normalizeVersion(version))
          }
          else {
            void tryFormula(index + 1)
          }
        }
        catch {
          void tryFormula(index + 1)
        }
      })

      // Timeout after 10 seconds
      setTimeout(() => {
        proc.kill()
        void tryFormula(index + 1)
      }, 10000)
    }

    void tryFormula(0)
  })
}

/**
 * Fetch the latest available version based on installation method.
 *
 * @param method - The installation method to use for fetching
 * @returns The latest version string (without 'v' prefix)
 */
export async function fetchLatestVersion(method: InstallationMethod): Promise<string> {
  switch (method) {
    case 'brew':
      return fetchLatestFromHomebrew()
    case 'curl':
    case 'unknown':
    default:
      return fetchLatestFromGitHub()
  }
}

/**
 * Verify that the installed version matches the expected version.
 *
 * @param expectedVersion - The version expected after upgrade
 * @returns Object with verified status and actual version
 */
export async function verifyInstalledVersion(expectedVersion: string): Promise<{
  verified: boolean
  actualVersion: string
}> {
  return new Promise((resolve) => {
    const proc: ChildProcess = spawn(process.execPath, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.on('error', () => {
      resolve({ verified: false, actualVersion: 'unknown' })
    })

    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        resolve({ verified: false, actualVersion: 'unknown' })
        return
      }

      const actualVersion = normalizeVersion(stdout.trim())
      const expected = normalizeVersion(expectedVersion)
      resolve({
        verified: actualVersion === expected,
        actualVersion,
      })
    })

    setTimeout(() => {
      proc.kill()
      resolve({ verified: false, actualVersion: 'timeout' })
    }, 5000)
  })
}
