import { TextAttributes } from '@opentui/core'
import { BRAND_ORANGE } from '../theme'

export interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={1}>
        <ascii-font font="block" text="WorkflowFiesta" color={BRAND_ORANGE} />
        <text attributes={TextAttributes.DIM}>
          AI Agents for Your Entire Business
        </text>
        {message && (
          <text attributes={TextAttributes.DIM}>{message}</text>
        )}
      </box>
    </box>
  )
}
