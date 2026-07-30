import type { CliConfig } from '../config'

/**
 * Sets the terminal window/tab title to the active conversation title via an OSC
 * escape sequence (`ESC ] 0 ; <title> BEL`). Inside tmux the sequence is wrapped
 * in tmux's DCS passthrough so it reaches the outer terminal, mirroring the
 * layering the clipboard helper uses for OSC 52.
 */

/** Env var that disables terminal-title updates (a config value takes precedence). */
export const DISABLE_TERMINAL_TITLE_ENV = 'WORKFLOWFIESTA_DISABLE_TERMINAL_TITLE'

/** Shown when there is no conversation title yet (a fresh chat). */
export const DEFAULT_TERMINAL_TITLE = 'WorkflowFiesta'

const MAX_TITLE_LENGTH = 256

/** "0"/"false"/empty all count as not disabled. */
function isDisabledByEnv(): boolean {
  const value = process.env[DISABLE_TERMINAL_TITLE_ENV]
  if (!value) {
    return false
  }
  return value !== '0' && value.toLowerCase() !== 'false'
}

/**
 * An explicit `terminalTitle` config value is authoritative; only when it is
 * unset do we fall back to {@link DISABLE_TERMINAL_TITLE_ENV}. Default: on.
 */
export function isTerminalTitleEnabled(config: CliConfig): boolean {
  if (typeof config.terminalTitle === 'boolean') {
    return config.terminalTitle
  }
  return !isDisabledByEnv()
}

/** Strip control bytes (so a title can't break out of the escape sequence) and cap length. */
export function sanitizeTitle(title: string): string {
  const cleaned = title.replace(/[\x00-\x1F\x7F]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned.length > MAX_TITLE_LENGTH ? cleaned.slice(0, MAX_TITLE_LENGTH) : cleaned
}

/**
 * Under tmux the base sequence must be wrapped in a DCS passthrough with inner
 * ESC bytes doubled, or tmux swallows it.
 */
export function buildTitleSequence(title: string, opts: { tmux?: boolean } = {}): string {
  const sequence = `\x1B]0;${title}\x07`
  if (opts.tmux) {
    return `\x1BPtmux;${sequence.replace(/\x1B/g, '\x1B\x1B')}\x1B\\`
  }
  return sequence
}

/** Emit a title sequence to the controlling terminal. Best-effort; never throws. */
function writeTitle(title: string): void {
  if (!process.stdout.isTTY) {
    return
  }
  try {
    // Single write so the escape sequence can't be torn across frames.
    process.stdout.write(buildTitleSequence(title, { tmux: Boolean(process.env.TMUX) }))
  }
  catch {
    // best-effort; titles are cosmetic
  }
}

let exitResetRegistered = false

/** Clear the title on process exit so it doesn't linger after `wf` is gone. Registered once. */
function registerExitReset(): void {
  if (exitResetRegistered) {
    return
  }
  exitResetRegistered = true
  process.once('exit', () => writeTitle(''))
}

/** Set the terminal title, sanitizing the input first. No-op off a TTY. */
export function setTerminalTitle(title: string): void {
  const cleaned = sanitizeTitle(title)
  if (!cleaned) {
    resetTerminalTitle()
    return
  }
  registerExitReset()
  writeTitle(cleaned)
}

/** Clear any title this process set, restoring the terminal's default. */
export function resetTerminalTitle(): void {
  writeTitle('')
}
