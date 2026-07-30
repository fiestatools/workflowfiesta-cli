import { describe, expect, it } from 'bun:test'
import {
  expandPastedTextPlaceholders,
  expandTrackedPastedText,
  formatPastePlaceholder,
  normalizeLineEndings,
  PASTE_SUMMARY_MAX_CHARS,
  PASTE_SUMMARY_MIN_LINES,
  pasteLineCount,
  shouldSummarizePaste,
} from '../../src/utils/paste-summary'
import { displaySlice, promptOffsetWidth } from '../../src/utils/prompt-display'

describe('prompt-display', () => {
  describe('promptOffsetWidth', () => {
    it('returns 0 for empty string', () => {
      expect(promptOffsetWidth('')).toBe(0)
    })

    it('returns correct width for ASCII text', () => {
      expect(promptOffsetWidth('hello')).toBe(5)
    })

    it('counts newlines as 1 width each', () => {
      expect(promptOffsetWidth('a\nb\nc')).toBe(5) // 'a' + '\n' + 'b' + '\n' + 'c'
    })

    it('returns correct width for CJK characters (2 columns each)', () => {
      expect(promptOffsetWidth('你好')).toBe(4) // 2 chars * 2 columns
    })

    it('returns correct width for mixed ASCII and CJK', () => {
      expect(promptOffsetWidth('hello你好')).toBe(9) // 5 + 4
    })

    it('handles emoji correctly', () => {
      // Most emoji are 2 columns wide
      const width = promptOffsetWidth('👍')
      expect(width).toBeGreaterThanOrEqual(1)
    })
  })

  describe('displaySlice', () => {
    it('returns full string when no args provided', () => {
      expect(displaySlice('hello')).toBe('hello')
    })

    it('slices ASCII string correctly', () => {
      expect(displaySlice('hello', 0, 3)).toBe('hel')
      expect(displaySlice('hello', 2, 5)).toBe('llo')
    })

    it('slices string with CJK characters correctly', () => {
      // '你好' is 4 display columns (2 per character)
      expect(displaySlice('你好world', 0, 4)).toBe('你好')
      expect(displaySlice('你好world', 4, 9)).toBe('world')
    })

    it('handles newlines in slice', () => {
      expect(displaySlice('a\nb\nc', 0, 3)).toBe('a\nb')
    })
  })
})

describe('paste-summary', () => {
  describe('constants', () => {
    it('has expected threshold values', () => {
      expect(PASTE_SUMMARY_MIN_LINES).toBe(3)
      expect(PASTE_SUMMARY_MAX_CHARS).toBe(150)
    })
  })

  describe('pasteLineCount', () => {
    it('returns 1 for single line', () => {
      expect(pasteLineCount('hello')).toBe(1)
    })

    it('returns 2 for two lines', () => {
      expect(pasteLineCount('line one\nline two')).toBe(2)
    })

    it('returns correct count for multiple lines', () => {
      expect(pasteLineCount('a\nb\nc\nd')).toBe(4)
    })

    it('returns 1 for empty string', () => {
      expect(pasteLineCount('')).toBe(1)
    })
  })

  describe('shouldSummarizePaste', () => {
    it('does not summarize 1-line text under 150 chars', () => {
      expect(shouldSummarizePaste('hello world')).toBe(false)
    })

    it('does not summarize 2-line text under 150 chars', () => {
      expect(shouldSummarizePaste('line one\nline two')).toBe(false)
    })

    it('summarizes text with 3+ lines', () => {
      expect(shouldSummarizePaste('a\nb\nc')).toBe(true)
    })

    it('summarizes text over 150 chars even if single line', () => {
      expect(shouldSummarizePaste('x'.repeat(151))).toBe(true)
    })

    it('does not summarize text at exactly 150 chars', () => {
      expect(shouldSummarizePaste('x'.repeat(150))).toBe(false)
    })
  })

  describe('formatPastePlaceholder', () => {
    it('formats line count into placeholder', () => {
      expect(formatPastePlaceholder(5)).toBe('[Pasted ~5 lines]')
      expect(formatPastePlaceholder(1)).toBe('[Pasted ~1 lines]')
      expect(formatPastePlaceholder(100)).toBe('[Pasted ~100 lines]')
    })
  })

  describe('normalizeLineEndings', () => {
    it('converts CRLF to LF', () => {
      expect(normalizeLineEndings('a\r\nb\r\nc')).toBe('a\nb\nc')
    })

    it('converts CR to LF', () => {
      expect(normalizeLineEndings('a\rb\rc')).toBe('a\nb\nc')
    })

    it('leaves LF unchanged', () => {
      expect(normalizeLineEndings('a\nb\nc')).toBe('a\nb\nc')
    })

    it('handles mixed line endings', () => {
      expect(normalizeLineEndings('a\r\nb\rc\nd')).toBe('a\nb\nc\nd')
    })
  })

  describe('expandTrackedPastedText', () => {
    it('expands a single placeholder', () => {
      const marker = '[Pasted ~3 lines]'
      const original = 'alpha\nbeta\ngamma'
      const markerWidth = promptOffsetWidth(marker)
      const prefixWidth = promptOffsetWidth('before ')

      expect(
        expandTrackedPastedText(`before ${marker} after`, [
          { start: prefixWidth, end: prefixWidth + markerWidth, text: original },
        ]),
      ).toBe('before alpha\nbeta\ngamma after')
    })

    it('expands multiple placeholders right-to-left', () => {
      const m1 = '[Pasted ~2 lines]'
      const m2 = '[Pasted ~3 lines]'
      const input = `${m1} middle ${m2}`
      const m1Width = promptOffsetWidth(m1)
      const middleStart = promptOffsetWidth(`${m1} middle `)

      expect(
        expandTrackedPastedText(input, [
          { start: 0, end: m1Width, text: 'one\ntwo' },
          { start: middleStart, end: middleStart + promptOffsetWidth(m2), text: 'a\nb\nc' },
        ]),
      ).toBe('one\ntwo middle a\nb\nc')
    })

    it('preserves wide characters around pasted text', () => {
      const marker = '[Pasted ~3 lines]'
      const prefix = '你好你好\n'
      const prefixWidth = promptOffsetWidth(prefix)
      const markerWidth = promptOffsetWidth(marker)

      expect(
        expandTrackedPastedText(`${prefix}${marker}\n尾部`, [
          {
            start: prefixWidth,
            end: prefixWidth + markerWidth,
            text: 'public:\n\tvoid Execute();\nprivate:',
          },
        ]),
      ).toBe('你好你好\npublic:\n\tvoid Execute();\nprivate:\n尾部')
    })

    it('only expands tracked occurrence, not duplicates in text', () => {
      const marker = '[Pasted ~3 lines]'
      const prefix = `keep ${marker} then `
      const prefixWidth = promptOffsetWidth(prefix)
      const markerWidth = promptOffsetWidth(marker)

      expect(
        expandTrackedPastedText(`${prefix}${marker} tail`, [
          {
            start: prefixWidth,
            end: prefixWidth + markerWidth,
            text: 'alpha\nbeta\ngamma',
          },
        ]),
      ).toBe(`keep ${marker} then alpha\nbeta\ngamma tail`)
    })

    it('handles empty ranges array', () => {
      expect(expandTrackedPastedText('hello world', [])).toBe('hello world')
    })
  })

  describe('expandPastedTextPlaceholders', () => {
    it('expands placeholder by value match', () => {
      const parts = [
        {
          type: 'text',
          text: 'original\ncontent',
          source: { text: { value: '[Pasted ~2 lines]' } },
        },
      ]
      expect(expandPastedTextPlaceholders('prefix [Pasted ~2 lines] suffix', parts)).toBe(
        'prefix original\ncontent suffix',
      )
    })

    it('ignores non-text parts', () => {
      const parts = [
        { type: 'file', text: 'file.txt' },
        {
          type: 'text',
          text: 'expanded',
          source: { text: { value: '[Pasted ~1 lines]' } },
        },
      ]
      expect(expandPastedTextPlaceholders('[Pasted ~1 lines]', parts)).toBe('expanded')
    })

    it('ignores parts without source.text', () => {
      const parts = [
        { type: 'text', text: 'no source' },
        { type: 'text', text: 'no text in source', source: {} },
      ]
      expect(expandPastedTextPlaceholders('[Pasted ~1 lines]', parts)).toBe('[Pasted ~1 lines]')
    })

    it('handles empty parts array', () => {
      expect(expandPastedTextPlaceholders('hello world', [])).toBe('hello world')
    })
  })
})
