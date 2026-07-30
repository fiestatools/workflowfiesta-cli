import { describe, expect, it } from 'bun:test'
import { buildOsc52 } from '../../src/utils/clipboard'

describe('buildOsc52', () => {
  it('encodes text as base64 in OSC 52 format', () => {
    const result = buildOsc52('hello')
    expect(result).toBe('\x1B]52;c;aGVsbG8=\x07')
  })

  it('handles empty text', () => {
    const result = buildOsc52('')
    expect(result).toBe('\x1B]52;c;\x07')
  })

  it('handles unicode text', () => {
    const result = buildOsc52('你好')
    expect(result).toBe('\x1B]52;c;5L2g5aW9\x07')
  })

  it('handles multi-line text', () => {
    const result = buildOsc52('line1\nline2\nline3')
    expect(result).toBe('\x1B]52;c;bGluZTEKbGluZTIKbGluZTM=\x07')
  })

  it('wraps in tmux passthrough when tmux option is true', () => {
    const result = buildOsc52('hello', { tmux: true })
    expect(result).toBe('\x1BPtmux;\x1B\x1B]52;c;aGVsbG8=\x07\x1B\\')
  })

  it('does not wrap in tmux passthrough when tmux option is false', () => {
    const result = buildOsc52('hello', { tmux: false })
    expect(result).toBe('\x1B]52;c;aGVsbG8=\x07')
  })

  it('does not wrap in tmux passthrough by default', () => {
    const result = buildOsc52('hello')
    expect(result).toBe('\x1B]52;c;aGVsbG8=\x07')
  })

  it('handles special characters', () => {
    const result = buildOsc52('a=b&c=d')
    expect(result).toBe('\x1B]52;c;YT1iJmM9ZA==\x07')
  })

  it('handles long text', () => {
    const longText = 'x'.repeat(1000)
    const result = buildOsc52(longText)
    expect(result.startsWith('\x1B]52;c;')).toBe(true)
    expect(result.endsWith('\x07')).toBe(true)

    const base64Content = result.slice(7, -1)
    expect(Buffer.from(base64Content, 'base64').toString()).toBe(longText)
  })
})
