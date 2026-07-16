import type { CliRenderer } from '@opentui/core'
import type { UpdateInfo } from '../installation'
import { useRenderer } from '@opentui/react'
import { useEffect, useState } from 'react'
import { CLI_VERSION } from '../cli'
import { getConfigManager } from '../config'
import { AUTO_UPGRADE_CHECK_DELAY_MS, runAutoUpgradeCheck } from '../installation'

export interface UseAutoUpgradeResult {
  /** Information about an available update (minor/major) */
  updateInfo: UpdateInfo | null
  /** Version of a patch that was just auto-installed */
  patchInstalled: string | null
  /** Dismiss the current notification */
  dismiss: () => void
}

export interface UseAutoUpgradeOptions {
  /** Custom renderer instance (uses useRenderer() if not provided) */
  renderer?: CliRenderer | null
  /** Delay before running the upgrade check (default: AUTO_UPGRADE_CHECK_DELAY_MS) */
  delayMs?: number
  /** Whether to send system notifications (default: true) */
  enableSystemNotifications?: boolean
}

/**
 * Hook for managing background auto-upgrade checks.
 *
 * Runs an upgrade check after a delay (default: 1 second) and provides:
 * - Update notification state for minor/major updates
 * - Patch installation notification state
 * - System notification triggers (OSC notifications)
 * - Dismiss function to clear notifications
 *
 * @example
 * ```tsx
 * const { updateInfo, patchInstalled, dismiss } = useAutoUpgrade()
 *
 * // Show notification banner if there's an update
 * {(updateInfo || patchInstalled) && (
 *   <UpdateNotification
 *     updateInfo={updateInfo}
 *     patchInstalled={patchInstalled}
 *     onDismiss={dismiss}
 *   />
 * )}
 * ```
 */
export function useAutoUpgrade(options: UseAutoUpgradeOptions = {}): UseAutoUpgradeResult {
  const {
    delayMs = AUTO_UPGRADE_CHECK_DELAY_MS,
    enableSystemNotifications = true,
  } = options

  const contextRenderer = useRenderer()
  const renderer = options.renderer !== undefined ? options.renderer : contextRenderer

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [patchInstalled, setPatchInstalled] = useState<string | null>(null)

  const dismiss = () => {
    setUpdateInfo(null)
    setPatchInstalled(null)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void runAutoUpgradeCheck({
        currentVersion: CLI_VERSION,
        getConfig: () => getConfigManager().getConfig(),
        onUpdateAvailable: (info) => {
          setUpdateInfo(info)

          if (enableSystemNotifications && renderer) {
            const title = info.releaseType === 'major'
              ? 'Major Update Available'
              : 'Update Available'
            const body = `WorkflowFiesta v${info.latestVersion} is available. Run 'wf upgrade' to update.`
            renderer.triggerNotification?.(body, title)
          }
        },
        onPatchInstalled: (newVersion) => {
          setPatchInstalled(newVersion)

          if (enableSystemNotifications && renderer) {
            renderer.triggerNotification?.(
              `WorkflowFiesta has been updated to v${newVersion}`,
              'Update Installed',
            )
          }
        },
      })
    }, delayMs)

    return () => clearTimeout(timer)
  }, [renderer, delayMs, enableSystemNotifications])

  return {
    updateInfo,
    patchInstalled,
    dismiss,
  }
}
