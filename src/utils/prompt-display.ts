const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function promptOffsetWidth(value: string): number {
  let width = 0
  for (const part of graphemes.segment(value)) {
    width += part.segment === '\n' ? 1 : Bun.stringWidth(part.segment)
  }
  return width
}

/**
 * Convert a display-width offset back to a JS string index.
 */
function displayOffsetIndex(value: string, offset: number): number {
  let width = 0
  for (const part of graphemes.segment(value)) {
    const segmentWidth = part.segment === '\n' ? 1 : Bun.stringWidth(part.segment)
    const next = width + segmentWidth
    if (next > offset)
      return part.index
    width = next
  }
  return value.length
}

/**
 * Slice a string using display-width offsets instead of string indices.
 */
export function displaySlice(value: string, start = 0, end = promptOffsetWidth(value)): string {
  return value.slice(displayOffsetIndex(value, start), displayOffsetIndex(value, end))
}
