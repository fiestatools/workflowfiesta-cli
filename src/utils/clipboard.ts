import { logger } from '../logger';

/**
 * Copy text to the clipboard, robustly, across local and remote sessions.
 *
 * Two mechanisms are layered so copy works "everywhere":
 *
 * 1. **Native tools** — `pbcopy` (macOS), `clip` (Windows), `wl-copy` / `xclip` /
 *    `xsel` (Linux), `clip.exe` (WSL). Rock-solid locally, with no size limit.
 * 2. **OSC 52** — a terminal escape sequence that asks the *terminal emulator*
 *    to set the clipboard. This is the only thing that works over **SSH / tmux**,
 *    where native tools would copy to the remote host's clipboard instead of the
 *    user's real machine.
 *
 * Order depends on context: locally we prefer native (reliable, unbounded size,
 * no writes to the TUI's stdout); over SSH we prefer OSC 52 (native would target
 * the wrong machine). Best-effort and never throws.
 *
 * Note: OSC 52 delivery cannot be confirmed — the terminal never acknowledges
 * it — so a `true` result there means "emitted", not "guaranteed pasted". Most
 * modern terminals honor it; a few have it disabled by default.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const native = { name: 'native', run: () => tryNativeCopy(text) };
  const osc52 = { name: 'osc52', run: () => writeOsc52(text) };
  // Over SSH, native tools hit the remote host — try the terminal (OSC 52) first.
  const strategies = isRemoteSession() ? [osc52, native] : [native, osc52];

  for (const strategy of strategies) {
    if (await strategy.run()) {
      logger.debug(`Clipboard copy succeeded via ${strategy.name}`);
      return true;
    }
  }

  logger.warn('Clipboard copy failed: no working clipboard mechanism');
  return false;
}

/** Whether we're in an SSH session, where native clipboard tools target the wrong host. */
function isRemoteSession(): boolean {
  return Boolean(process.env.SSH_TTY || process.env.SSH_CONNECTION || process.env.SSH_CLIENT);
}

/** Try each platform clipboard binary in turn, writing the text to its stdin. */
async function tryNativeCopy(text: string): Promise<boolean> {
  for (const command of nativeCommands()) {
    try {
      const proc = Bun.spawn(command, { stdin: 'pipe', stdout: 'ignore', stderr: 'ignore' });
      proc.stdin.write(text);
      await proc.stdin.end();
      if ((await proc.exited) === 0) {
        return true;
      }
    } catch {
      // Tool not installed (ENOENT) or failed to spawn — try the next candidate.
    }
  }
  return false;
}

/** Candidate clipboard commands for the current platform, in preference order. */
function nativeCommands(): string[][] {
  switch (process.platform) {
    case 'darwin':
      return [['pbcopy']];
    case 'win32':
      return [['clip']];
    default:
      // Linux/BSD: Wayland, then X11 tools, then WSL's bridge to the Windows clipboard.
      return [
        ['wl-copy'],
        ['xclip', '-selection', 'clipboard'],
        ['xsel', '--clipboard', '--input'],
        ['clip.exe'],
      ];
  }
}

/**
 * Emit an OSC 52 clipboard-set sequence to the controlling terminal.
 *
 * Only attempted on a TTY. When inside tmux, the sequence is wrapped in tmux's
 * DCS passthrough so it reaches the outer terminal.
 */
function writeOsc52(text: string): boolean {
  if (!process.stdout.isTTY) {
    return false;
  }
  try {
    // Written in a single call so the escape sequence can't be torn across frames.
    process.stdout.write(buildOsc52(text, { tmux: Boolean(process.env.TMUX) }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Build an OSC 52 "set clipboard" escape sequence for `text`.
 *
 * Base form: `ESC ] 52 ; c ; <base64> BEL`. Under tmux it must be wrapped in a
 * DCS passthrough (`ESC P tmux; … ESC \`) with inner ESC bytes doubled, or tmux
 * swallows it. Exported for testing.
 */
export function buildOsc52(text: string, opts: { tmux?: boolean } = {}): string {
  const payload = Buffer.from(text, 'utf8').toString('base64');
  const sequence = `\x1b]52;c;${payload}\x07`;
  if (opts.tmux) {
    return `\x1bPtmux;${sequence.replace(/\x1b/g, '\x1b\x1b')}\x1b\\`;
  }
  return sequence;
}
