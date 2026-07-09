import { themeColors } from '../theme'

/** Props for the Divider component. */
export interface DividerProps {
  /** Width of the divider in characters. Defaults to 28. */
  width?: number
  /** Custom character to use for the divider. Defaults to '─'. */
  char?: string
}

/** Default divider width in characters. */
const DEFAULT_DIVIDER_WIDTH = 28

/** Default divider character. */
const DEFAULT_DIVIDER_CHAR = '─'

/**
 * Horizontal divider component for separating sections.
 */
export function Divider({
  width = DEFAULT_DIVIDER_WIDTH,
  char = DEFAULT_DIVIDER_CHAR,
}: DividerProps) {
  return <text fg={themeColors.textSubtle}>{char.repeat(width)}</text>
}
