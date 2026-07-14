import type { ChatMessage } from '../chat'
import type { AuthCopDecision, SpecialMessageType } from '../runs/runEvents'
import { TextAttributes } from '@opentui/core'
import { SUBTLE_BG, themeColors } from '../theme'
import { MarkdownText } from './MarkdownText'

/** Header copy and accent color per guard agent, mirroring the web bubbles. */
const SPECIAL_DISPLAY: Record<SpecialMessageType, { title: string, subtitle: string, badge?: string, color: string }> = {
  auth_cop: {
    title: 'Auth Cop',
    subtitle: 'security review',
    color: themeColors.authCop,
  },
  secret_safe: {
    title: 'Secret Safe',
    subtitle: 'security notice',
    badge: 'Redacted',
    color: themeColors.secretSafe,
  },
  quality_control: {
    title: 'Helping Hand',
    subtitle: 'here to help',
    badge: 'Suggestion',
    color: themeColors.helpingHand,
  },
}

/** Decision badge per Auth Cop ruling, mirroring the web labels. */
const DECISION_DISPLAY: Record<AuthCopDecision, { label: string, color: string }> = {
  approved: { label: '✓ Approved & executed', color: themeColors.success },
  need_confirmation: { label: '⟳ Awaiting confirmation', color: themeColors.warning },
  declined: { label: '✕ Declined', color: themeColors.error },
}

/** Shown under an `auth_cop` verdict that awaits the user's go-ahead. */
const WAITING_NOTICE = 'Auth Cop is waiting for your reply before proceeding. Respond in the chat to continue.'

/** Shown under a declined `auth_cop` verdict, pointing at the escalation path. */
const ESCALATION_NOTICE = 'Need more access? An org admin can grant additional permissions.'

/** Props for a guard-agent verdict bubble. */
export interface SpecialMessageProps {
  message: ChatMessage & { special: NonNullable<ChatMessage['special']> }
  timestamp: string
}

/**
 * A guard-agent verdict (Auth Cop / Secret Safe / Helping Hand) rendered as a
 * distinct bubble with the agent's identity, so platform notices never read as
 * part of the assistant's reply.
 */
export function SpecialMessage({ message, timestamp }: SpecialMessageProps) {
  const display = SPECIAL_DISPLAY[message.special.type]
  const decision = message.special.type === 'auth_cop' && message.special.decision
    ? DECISION_DISPLAY[message.special.decision]
    : undefined

  return (
    <box
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      marginBottom={1}
      backgroundColor={SUBTLE_BG}
    >
      <box flexDirection="row">
        <text attributes={TextAttributes.BOLD}>
          <span fg={display.color}>{display.title}</span>
          {' '}
        </text>
        <text attributes={TextAttributes.DIM}>
          <span fg={themeColors.textSubtle}>
            {display.subtitle}
            {' · '}
            {timestamp}
          </span>
          {' '}
        </text>
        {decision && (
          <text>
            <span fg={decision.color}>{decision.label}</span>
          </text>
        )}
        {!decision && display.badge && (
          <text>
            <span fg={display.color}>{display.badge}</span>
          </text>
        )}
      </box>
      <box paddingLeft={2}>
        <MarkdownText content={message.content} />
      </box>
      {message.special.decision === 'need_confirmation' && (
        <box paddingLeft={2} marginTop={1}>
          <text fg={themeColors.warning}>{WAITING_NOTICE}</text>
        </box>
      )}
      {message.special.decision === 'declined' && (
        <box paddingLeft={2} marginTop={1}>
          <text fg={themeColors.textMuted}>{ESCALATION_NOTICE}</text>
        </box>
      )}
    </box>
  )
}
