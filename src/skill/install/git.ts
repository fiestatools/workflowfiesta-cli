import { execFile } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, normalize, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const CLONE_TIMEOUT_MS = 120_000

export class GitCloneError extends Error {
  constructor(
    message: string,
    public readonly isAuthError = false,
  ) {
    super(message)
    this.name = 'GitCloneError'
  }
}

function isAuthFailure(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('authentication failed')
    || lower.includes('could not read username')
    || lower.includes('permission denied')
    || lower.includes('repository not found')
    || lower.includes('requested url returned error: 403')
    || lower.includes('fatal: could not read')
  )
}

async function hasGhCli(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['--version'], { timeout: 5000 })
    return true
  }
  catch {
    return false
  }
}

async function isGhAuthenticated(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['auth', 'status'], { timeout: 5000 })
    return true
  }
  catch {
    return false
  }
}

function parseGitHubRepo(url: string): { owner: string, repo: string } | null {
  const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/)
  if (httpsMatch)
    return { owner: httpsMatch[1]!, repo: httpsMatch[2]! }

  const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/.]+)/)
  if (sshMatch)
    return { owner: sshMatch[1]!, repo: sshMatch[2]! }

  return null
}

async function cloneWithGh(
  owner: string,
  repo: string,
  tempDir: string,
  ref?: string,
): Promise<void> {
  const gitFlags = ref ? ['--depth=1', '--branch', ref] : ['--depth=1']
  await execFileAsync(
    'gh',
    ['repo', 'clone', `${owner}/${repo}`, tempDir, '--', ...gitFlags],
    { timeout: CLONE_TIMEOUT_MS },
  )
}

export async function cloneRepo(url: string, ref?: string): Promise<string> {
  const tempDir = join(tmpdir(), `wf-skill-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  await mkdir(tempDir, { recursive: true })

  const args = ['clone', '--depth', '1']
  if (ref)
    args.push('--branch', ref)
  args.push(url, tempDir)

  try {
    await execFileAsync('git', args, {
      timeout: CLONE_TIMEOUT_MS,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
    return tempDir
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (isAuthFailure(message)) {
      const ghRepo = parseGitHubRepo(url)
      if (ghRepo && await hasGhCli() && await isGhAuthenticated()) {
        try {
          await rm(tempDir, { recursive: true, force: true })
          await mkdir(tempDir, { recursive: true })
          await cloneWithGh(ghRepo.owner, ghRepo.repo, tempDir, ref)
          return tempDir
        }
        catch {
          // Fall through to auth error
        }
      }

      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
      throw new GitCloneError(
        `Authentication failed for ${url}\n\n`
        + `For private repositories:\n`
        + `  SSH:   Ensure your key is loaded (ssh-add -l)\n`
        + `  HTTPS: Configure git credentials or run 'gh auth login'\n`
        + `  Check: 'gh auth status' or 'ssh -T git@github.com'`,
        true,
      )
    }

    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw new GitCloneError(`Failed to clone ${url}: ${message}`)
  }
}

export async function cleanupTempDir(dir: string): Promise<void> {
  const normalizedDir = normalize(resolve(dir))
  const normalizedTmp = normalize(resolve(tmpdir()))

  if (!normalizedDir.startsWith(normalizedTmp + sep)) {
    throw new Error('Refusing to delete directory outside temp folder')
  }

  await rm(dir, { recursive: true, force: true })
}
