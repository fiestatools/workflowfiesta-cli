import type { ReactNode } from 'react'
import { TextAttributes } from '@opentui/core'
import { themeColors } from '../theme'

export interface SelectableRowProps {
  /** Whether this row is currently selected/focused */
  isSelected: boolean
  /** Primary label text */
  label: string | ReactNode
  /** Optional secondary text shown below the label */
  sublabel?: string | null
  /** Optional badge/indicator shown after the label (e.g., "(current)") */
  badge?: string
  /** Color for the badge */
  badgeColor?: string
  /** Width of the selector column (default: 2) */
  selectorWidth?: number
  /** Custom selector character when selected (default: '▸') */
  selectedChar?: string
  /** Left padding for the row (default: 1) */
  paddingLeft?: number
}

export function SelectableRow({
  isSelected,
  label,
  sublabel,
  badge,
  badgeColor = themeColors.success,
  selectorWidth = 2,
  selectedChar = '▸',
  paddingLeft = 1,
}: SelectableRowProps) {
  const textColor = isSelected ? themeColors.primary : themeColors.text
  const textAttributes = isSelected ? TextAttributes.BOLD : undefined

  return (
    <box flexDirection="row" paddingLeft={paddingLeft}>
      {/* Selection indicator */}
      <text style={{ width: selectorWidth }}>
        <span fg={textColor}>{isSelected ? selectedChar : ' '}</span>
      </text>

      {/* Content */}
      <box flexDirection="column" flexGrow={1}>
        <text>
          {typeof label === 'string'
            ? (
                <span fg={textColor} attributes={textAttributes}>
                  {label}
                </span>
              )
            : label}
          {badge && (
            <span fg={badgeColor}>
              {' '}
              {badge}
            </span>
          )}
        </text>
        {sublabel && (
          <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>
            {sublabel}
          </text>
        )}
      </box>
    </box>
  )
}
