import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'

const DEFAULT_COMMAND_TIMEOUT_MS = 5_000

export interface CommandResult {
  /** Standard output from the command */
  stdout: string
  /** Standard error from the command */
  stderr: string
  /** Exit code (0 for success) */
  exitCode: number
  /** Whether the command timed out */
  timedOut: boolean
}

export interface RunCommandOptions {
  /** Additional environment variables */
  env?: Record<string, string>
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number
  /** Whether to use shell (default: false) */
  shell?: boolean
}

/**
 * Run a shell command and return the result.
 *
 * @param command - The command to run
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Promise resolving to the command result
 */
export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  const {
    env,
    timeout = DEFAULT_COMMAND_TIMEOUT_MS,
    shell = false,
  } = options

  return new Promise((resolve) => {
    const proc: ChildProcess = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell,
      env: env ? { ...process.env, ...env } : undefined,
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      resolve({
        stdout,
        stderr: stderr || error.message,
        exitCode: 1,
        timedOut: false,
      })
    })

    proc.on('close', (code: number | null) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
        timedOut,
      })
    })

    const timer = setTimeout(() => {
      timedOut = true
      proc.kill()
    }, timeout)

    proc.on('close', () => clearTimeout(timer))
  })
}

/**
 * Run a command and return stdout only, or null on error.
 * Useful for simple queries like `which brew`.
 *
 * @param command - The command to run
 * @param args - Command arguments
 * @param timeout - Timeout in milliseconds
 * @returns stdout string or null on error
 */
export async function runCommandSimple(
  command: string,
  args: string[],
  timeout?: number,
): Promise<string | null> {
  const result = await runCommand(command, args, { timeout })
  return result.exitCode === 0 && !result.timedOut ? result.stdout : null
}
