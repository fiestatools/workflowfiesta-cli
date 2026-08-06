import { bold, muted, orange } from '../theme'
import { truncateText } from './truncateText'

export interface ExitSummary {
  conversationUid?: string
  title?: string
}

const EXIT_TITLE_MAX_LENGTH = 60
const LABEL_WIDTH = 10

/** Erase-to-end-of-line, so a mispositioned cursor can't leave stale text trailing our own. */
const CLEAR_LINE = '\x1B[K'

function row(label: string, value: string): string {
  return `  ${muted(label.padEnd(LABEL_WIDTH))}${value}`
}

export function formatExitSummary(summary: ExitSummary): string | undefined {
  if (!summary.conversationUid) {
    return undefined
  }

  const title = truncateText(summary.title ?? '', EXIT_TITLE_MAX_LENGTH) || 'Untitled conversation'

  return [
    '',
    `  ${bold(orange('WorkflowFiesta'))}`,
    '',
    row('Session', title),
    row('Continue', orange(`wf -s ${summary.conversationUid}`)),
    '',
  ]
    .map(line => `${line}${CLEAR_LINE}`)
    .join('\n')
}

export function printExitSummary(summary: ExitSummary): void {
  if (!process.stdout.isTTY) {
    return
  }
  const banner = formatExitSummary(summary)
  if (!banner) {
    return
  }
  try {
    process.stdout.write(`${banner}\n`)
  }
  catch {
    // best-effort; the terminal is already tearing down
  }
}
