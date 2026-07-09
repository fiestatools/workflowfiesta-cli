import type { AccessTokenRevealEvent } from '../runs/runEvents'
import { TextAttributes } from '@opentui/core'
import { SUBTLE_BG, themeColors } from '../theme'

/** Props for the access-token reveal card. */
export interface AccessTokenCardProps {
  reveal: AccessTokenRevealEvent
  /** Mask the secret (default): show a short identifying prefix, then bullets. */
  masked?: boolean
}

/** Format an ISO expiry into a short, human date; falls back to the raw value. */
function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt)
  return Number.isNaN(date.getTime()) ? expiresAt : date.toLocaleString()
}

/**
 * Render the secret masked: a short leading prefix (enough to recognize it as a
 * `wf_…` token, not enough to be sensitive) followed by a fixed run of bullets.
 * The bullet count is fixed so it never leaks the real secret's length.
 */
function maskedSecret(secret: string): string {
  const prefix = secret.slice(0, 4)
  return `${prefix}${'•'.repeat(24)}`
}

/**
 * One-time reveal of an access token the agent's `create_access_token` tool just
 * minted. The secret is masked by default — the copy action works on the full
 * value without ever putting it on screen; pass `masked={false}` only when the
 * user explicitly asks to reveal it.
 */
export function AccessTokenCard({ reveal, masked = true }: AccessTokenCardProps) {
  return (
    <box
      style={{
        border: true,
        borderColor: themeColors.warning,
        backgroundColor: SUBTLE_BG,
        flexDirection: 'column',
        padding: 1,
      }}
    >
      <text attributes={TextAttributes.BOLD}>
        <span fg={themeColors.warning}>Access token created</span>
      </text>
      <text>
        <span fg={themeColors.textMuted}>Name: </span>
        <span fg={themeColors.text}>{reveal.name}</span>
      </text>
      <box marginTop={1} flexDirection="column">
        <text fg={themeColors.textMuted}>Secret (copy it now — it won't be shown again):</text>
        <text selectable={!masked}>
          <span fg={masked ? themeColors.textMuted : themeColors.success} attributes={TextAttributes.BOLD}>
            {masked ? maskedSecret(reveal.secretKey) : reveal.secretKey}
          </span>
        </text>
      </box>
      {reveal.expiresAt && (
        <text marginTop={1}>
          <span fg={themeColors.textSubtle}>
            Expires:
            {formatExpiry(reveal.expiresAt)}
          </span>
        </text>
      )}
    </box>
  )
}
