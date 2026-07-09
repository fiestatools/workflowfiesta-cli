import { themeColors } from '../theme'

export interface DividerProps {
  /** Width of the divider in characters. */
  width?: number
}

const DEFAULT_DIVIDER_WIDTH = 28

export function Divider({ width = DEFAULT_DIVIDER_WIDTH }: DividerProps) {
  return <text fg={themeColors.textSubtle}>{'─'.repeat(width)}</text>
}
