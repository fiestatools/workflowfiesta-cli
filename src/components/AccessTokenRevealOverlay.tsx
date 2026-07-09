import type { AccessTokenRevealEvent } from '../runs/runEvents'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useState } from 'react'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { AccessTokenCard } from './AccessTokenCard'

/** Props for the access-token reveal overlay. */
export interface AccessTokenRevealOverlayProps {
  reveal: AccessTokenRevealEvent
  onCopy: () => Promise<boolean>
  onDismiss: () => void
}

type Action = 'copy' | 'reveal' | 'dismiss'
interface Feedback { ok: boolean, text: string }

/**
 * Modal shown when the agent's `create_access_token` tool mints a token. It owns
 * the keyboard (so shortcuts can't collide with typing). The secret is masked by
 * default: Copy grabs the full value without ever displaying it, and Reveal
 * toggles the plaintext only on explicit request. Shown once — copy before
 * dismissing.
 */
export function AccessTokenRevealOverlay({ reveal, onCopy, onDismiss }: AccessTokenRevealOverlayProps) {
  const actions: Action[] = ['copy', 'reveal', 'dismiss']
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | undefined>()

  const runCopy = async (): Promise<void> => {
    const ok = await onCopy()
    setFeedback(
      ok
        ? { ok: true, text: '✓ Copied to clipboard' }
        : { ok: false, text: 'Copy failed — reveal the secret, then select it to copy manually' },
    )
  }

  const runAction = (action: Action): void => {
    if (action === 'copy')
      void runCopy()
    else if (action === 'reveal')
      setRevealed(prev => !prev)
    else onDismiss()
  }

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onDismiss()
    }
    else if (key.name === 'c') {
      void runCopy()
    }
    else if (key.name === 'r') {
      setRevealed(prev => !prev)
    }
    else if (key.name === 'tab' || key.name === 'left' || key.name === 'right') {
      const dir = key.name === 'left' ? -1 : 1
      setFocusedIndex(prev => (prev + dir + actions.length) % actions.length)
    }
    else if (key.name === 'return') {
      runAction(actions[focusedIndex]!)
    }
  })

  return (
    <box
      style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        zIndex: 100,
        backgroundColor: SUBTLE_BG,
        border: true,
        borderColor: BRAND_ORANGE,
        flexDirection: 'column',
        padding: 1,
      }}
    >
      <AccessTokenCard reveal={reveal} masked={!revealed} />

      <box flexDirection="row" paddingLeft={1} marginTop={1} gap={2}>
        {actions.map((action, i) => {
          const isFocused = focusedIndex === i
          const label
            = action === 'copy' ? 'Copy (c)' : action === 'reveal' ? (revealed ? 'Hide (r)' : 'Reveal (r)') : 'Dismiss'
          const color = action === 'copy' ? themeColors.primary : themeColors.textMuted
          return (
            <text key={action}>
              <span fg={isFocused ? color : themeColors.textMuted} attributes={isFocused ? TextAttributes.BOLD : undefined}>
                {isFocused ? '▸ ' : '  '}
                {label}
              </span>
            </text>
          )
        })}
      </box>

      {feedback
        ? (
            <text paddingLeft={1}>
              <span fg={feedback.ok ? themeColors.success : themeColors.error}>{feedback.text}</span>
            </text>
          )
        : (
            <text fg={themeColors.textSubtle} paddingLeft={1}>c to copy · r to reveal · Enter/Esc to dismiss</text>
          )}
    </box>
  )
}
