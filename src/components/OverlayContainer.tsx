import type { ReactNode } from 'react'
import { TextAttributes } from '@opentui/core'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

export interface OverlayContainerProps {
  /** Content to render inside the overlay */
  children: ReactNode
  /** Title shown at the top of the overlay */
  title: string
  /** Optional version/subtitle shown next to the title */
  subtitle?: string
  /** Help text shown below the title */
  helpText?: string
  /** Fixed height for the overlay (auto if not specified) */
  height?: number
}

export function OverlayContainer({
  children,
  title,
  subtitle,
  helpText,
  height,
}: OverlayContainerProps) {
  return (
    <box
      style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        height,
        zIndex: 100,
        backgroundColor: SUBTLE_BG,
        border: true,
        borderColor: BRAND_ORANGE,
        flexDirection: 'column',
        padding: 1,
      }}
    >
      <text>
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}>
          {' '}
          {title}
        </span>
        {subtitle && (
          <span fg={themeColors.textSubtle}>
            {' '}
            {subtitle}
          </span>
        )}
      </text>
      {helpText && (
        <text fg={themeColors.textSubtle}>
          {' '}
          {helpText}
        </text>
      )}
      <text style={{ height: 1 }} />
      {children}
    </box>
  )
}
