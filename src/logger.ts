import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Log levels in order of severity.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * CLI logger that writes to a log file in the config directory.
 *
 * Logs are written to `~/.config/workflowfiesta/cli/cli.log`.
 */
class Logger {
  private logPath: string | undefined
  private minLevel: LogLevel = 'info'
  private initialized = false

  /** Initialize the logger. Returns the log file path. */
  init(options?: { logDir?: string, minLevel?: LogLevel }): string {
    if (this.initialized) {
      return this.logPath!
    }

    const baseDir = options?.logDir ?? join(homedir(), '.config', 'workflowfiesta', 'cli')
    this.logPath = join(baseDir, 'cli.log')
    this.minLevel = options?.minLevel ?? 'info'

    // Ensure the log directory exists
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true, mode: 0o700 })
    }

    this.initialized = true
    return this.logPath
  }

  /** Set the minimum log level. */
  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  debug(message: string, data?: unknown): void {
    this.write('debug', message, data)
  }

  info(message: string, data?: unknown): void {
    this.write('info', message, data)
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data)
  }

  error(message: string, data?: unknown): void {
    this.write('error', message, data)
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    if (!this.initialized) {
      this.init()
    }

    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return
    }

    const timestamp = new Date().toISOString()
    let logLine = `${timestamp} [${level.toUpperCase()}] ${message}`

    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data)
        logLine += ` ${dataStr}`
      }
      catch {
        logLine += ' [unserializable data]'
      }
    }

    logLine += '\n'

    try {
      appendFileSync(this.logPath!, logLine)
    }
    catch {
      // Silently fail if we can't write to the log file
    }
  }
}

export const logger = new Logger()
