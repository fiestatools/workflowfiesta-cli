import type { UpdateInfo } from '../installation'
import { useEffect, useState } from 'react'
import { themeColors } from '../theme'

export interface UpdateNotificationProps {
  /** Information about the available update */
  updateInfo: UpdateInfo | null
  /** Whether a patch was just auto-installed */
  patchInstalled?: string | null
  /** Callback when notification is dismissed */
  onDismiss?: () => void
  /** Auto-dismiss delay in ms (default: 10000 for patches, never for updates) */
  autoDismissMs?: number
}

export function UpdateNotification({
  updateInfo,
  patchInstalled,
  onDismiss,
  autoDismissMs,
}: UpdateNotificationProps) {
  const [visible, setVisible] = useState(true)

  // Handle auto-dismiss for patch notifications
  useEffect(() => {
    if (!patchInstalled)
      return

    const delay = autoDismissMs ?? 10_000
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, delay)

    return () => clearTimeout(timer)
  }, [patchInstalled, autoDismissMs, onDismiss])

  // Reset visibility when new notification comes in
  useEffect(() => {
    setVisible(true)
  }, [updateInfo, patchInstalled])

  if (!visible)
    return null

  // Patch installed notification (success)
  if (patchInstalled) {
    return (
      <box
        width="100%"
        height={3}
        flexDirection="row"
        backgroundColor={themeColors.bgSubtle}
        borderStyle="rounded"
        borderColor={themeColors.success}
        paddingX={1}
        paddingY={0}
      >
        <box flexGrow={1} flexDirection="column" justifyContent="center">
          <text fg={themeColors.success}>
            Updated to v
            {patchInstalled}
          </text>
        </box>
        <box flexGrow={0} flexDirection="column" justifyContent="center">
          <text fg={themeColors.textMuted}>(auto-dismiss)</text>
        </box>
      </box>
    )
  }

  if (updateInfo) {
    const isBreaking = updateInfo.releaseType === 'major'
    const borderColor = isBreaking ? themeColors.warning : themeColors.info

    return (
      <box
        width="100%"
        height={3}
        flexDirection="row"
        backgroundColor={themeColors.bgSubtle}
        borderStyle="rounded"
        borderColor={borderColor}
        paddingX={1}
        paddingY={0}
      >
        <box flexGrow={1} flexDirection="column" justifyContent="center">
          {/* Nested styled runs must be <span>, not <text> — OpenTUI TextNode only
              accepts strings / TextNodeRenderable / StyledText as children. */}
          <text fg={themeColors.text}>
            <span fg={borderColor}>
              {isBreaking ? 'Major update' : 'Update available'}
              :
            </span>
            {' '}
            v
            {updateInfo.currentVersion}
            {' '}
            <span fg={themeColors.textMuted}>-&gt;</span>
            {' '}
            v
            {updateInfo.latestVersion}
          </text>
        </box>
        <box flexGrow={0} flexDirection="column" justifyContent="center">
          <text fg={themeColors.textMuted}>
            Run
            {' '}
            <span fg={themeColors.primary}>wf upgrade</span>
            {' '}
            | [d] dismiss
          </text>
        </box>
      </box>
    )
  }

  return null
}
