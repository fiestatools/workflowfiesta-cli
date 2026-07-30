import { displaySlice } from './prompt-display'

export const PASTE_SUMMARY_MIN_LINES = 3

export const PASTE_SUMMARY_MAX_CHARS = 150

export interface PastedTextPart {
  type: string
  text: string
  source?: {
    text?: {
      value: string
    }
  }
}

export function pasteLineCount(text: string): number {
  return (text.match(/\n/g)?.length ?? 0) + 1
}

export function shouldSummarizePaste(text: string): boolean {
  const lineCount = pasteLineCount(text)
  return lineCount >= PASTE_SUMMARY_MIN_LINES || text.length > PASTE_SUMMARY_MAX_CHARS
}

export function formatPastePlaceholder(lineCount: number): string {
  return `[Pasted ~${lineCount} lines]`
}

export interface PasteExpandRange {
  start: number
  end: number
  text: string
}

export function expandTrackedPastedText(text: string, ranges: PasteExpandRange[]): string {
  return ranges
    .slice()
    .sort((a, b) => b.start - a.start)
    .reduce(
      (result, part) => displaySlice(result, 0, part.start) + part.text + displaySlice(result, part.end),
      text,
    )
}

export function expandPastedTextPlaceholders(text: string, parts: PastedTextPart[]): string {
  return parts.reduce((result, part) => {
    if (part.type !== 'text' || !part.source?.text)
      return result
    return result.replace(part.source.text.value, part.text)
  }, text)
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}
