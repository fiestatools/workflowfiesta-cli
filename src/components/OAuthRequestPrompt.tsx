import type { OAuthRequestEvent } from '../runs/runEvents'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useState } from 'react'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

/** Props for the OAuth request prompt. */
export interface OAuthRequestPromptProps {
  event: OAuthRequestEvent
  onConnect: () => Promise<boolean>
  onCancel: () => void
}

/**
 * Prompt for a parked run's `request_oauth_connection` tool. Shows the provider
 * and requested scopes; Connect opens the consent page in the browser and the
 * service polls until it resolves (unmounting this overlay). Mirrors the
 * extension's OAuth card.
 */
export function OAuthRequestPrompt({ event, onConnect, onCancel }: OAuthRequestPromptProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [note, setNote] = useState<string | undefined>()

  const runConnect = async (): Promise<void> => {
    setConnecting(true)
    const opened = await onConnect()
    setNote(
      opened
        ? 'Opened your browser. Waiting for you to authorize…'
        : `Could not open a browser automatically. Visit: ${event.authorizeUrl}`,
    )
  }

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onCancel()
      return
    }
    if (connecting)
      return
    if (key.name === 'up' || key.name === 'down' || key.name === 'tab') {
      setSelectedIndex(prev => (prev === 0 ? 1 : 0))
    }
    else if (key.name === 'return') {
      if (selectedIndex === 0)
        void runConnect()
      else onCancel()
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
      <text>
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}>
          {' '}
          Connect
          {' '}
          {event.provider}
        </span>
      </text>
      {event.label && <text fg={themeColors.textMuted} paddingLeft={1}>{event.label}</text>}
      {event.scopes.length > 0 && (
        <text fg={themeColors.textSubtle} paddingLeft={1}>
          Scopes:
          {' '}
          {event.scopes.join(', ')}
        </text>
      )}
      <text style={{ height: 1 }} />

      {connecting
        ? (
            <text fg={themeColors.info} paddingLeft={1}>
              <span>Waiting for authorization… (Esc to cancel)</span>
            </text>
          )
        : (
            <box flexDirection="row" paddingLeft={1} gap={2}>
              <text>
                <span fg={selectedIndex === 0 ? themeColors.primary : themeColors.textMuted} attributes={selectedIndex === 0 ? TextAttributes.BOLD : undefined}>
                  {selectedIndex === 0 ? '▸ ' : '  '}
                  Connect (open browser)
                </span>
              </text>
              <text>
                <span fg={selectedIndex === 1 ? themeColors.error : themeColors.textMuted} attributes={selectedIndex === 1 ? TextAttributes.BOLD : undefined}>
                  {selectedIndex === 1 ? '▸ ' : '  '}
                  Cancel
                </span>
              </text>
            </box>
          )}

      {note && <text fg={themeColors.info} paddingLeft={1}>{note}</text>}
      {!connecting && (
        <text fg={themeColors.textSubtle} paddingLeft={1}>↑↓/Tab to move · Enter to confirm · Esc to dismiss</text>
      )}
    </box>
  )
}
