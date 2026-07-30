import type { CliConfig } from '../config'

/**
 * Sets the terminal window/tab title via an OSC escape sequence
 * (`ESC ] 0 ; <title> BEL`). Inside tmux the sequence is wrapped in tmux's DCS
 * passthrough so it reaches the outer terminal, mirroring the layering the
 * clipboard helper uses for OSC 52.
 */

export const DISABLE_TERMINAL_TITLE_ENV = 'WORKFLOWFIESTA_DISABLE_TERMINAL_TITLE'

/** Every title we set is prefixed with this, so `wf` tabs stand out from other terminals. */
export const TERMINAL_TITLE_PREFIX = 'WF'

const MAX_TITLE_LENGTH = 256

function isDisabledByEnv(): boolean {
  const value = process.env[DISABLE_TERMINAL_TITLE_ENV]
  if (!value) {
    return false
  }
  return value !== '0' && value.toLowerCase() !== 'false'
}

/** An explicit `terminalTitle` config value is authoritative; the env var is only the fallback. */
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

/** `WF - <title>`, or a bare `WF` when there is nothing to append (a fresh chat). */
export function formatTerminalTitle(title: string): string {
  const cleaned = sanitizeTitle(title)
  return cleaned ? `${TERMINAL_TITLE_PREFIX} - ${cleaned}` : TERMINAL_TITLE_PREFIX
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

/** Clear the title on process exit so it doesn't linger after `wf` is gone. */
function registerExitReset(): void {
  if (exitResetRegistered) {
    return
  }
  exitResetRegistered = true
  process.once('exit', () => writeTitle(''))
}

/** Set the terminal title, prefixed and sanitized. No-op off a TTY. */
export function setTerminalTitle(title: string): void {
  registerExitReset()
  writeTitle(formatTerminalTitle(title))
}

/** Clear any title this process set, restoring the terminal's default. */
export function resetTerminalTitle(): void {
  writeTitle('')
}
