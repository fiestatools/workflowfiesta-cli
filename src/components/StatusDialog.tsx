import type { ChatState } from '../chat'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

/** Props for the status dialog overlay. */
export interface StatusDialogProps {
  state: ChatState
  version: string
  onClose: () => void
}

/** Format a relative time string from a date. */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60)
    return 'just now'
  if (diffMin < 60)
    return `${diffMin}m ago`
  if (diffHour < 24)
    return `${diffHour}h ago`
  return `${diffDay}d ago`
}

/** Status overlay showing current connection, agent, and conversation info. */
export function StatusDialog({ state, version, onClose }: StatusDialogProps) {
  useKeyboard((key) => {
    if (key.name === 'escape' || key.name === 'return') {
      onClose()
    }
  })

  const connectionStatus = state.isConnecting
    ? 'Connecting...'
    : state.isConnected
      ? 'Connected'
      : 'Disconnected'

  const connectionColor = state.isConnecting
    ? themeColors.warning
    : state.isConnected
      ? themeColors.success
      : themeColors.error

  const messageCount = state.messages.length
  const userMessages = state.messages.filter(m => m.role === 'user').length
  const assistantMessages = state.messages.filter(m => m.role === 'assistant').length

  const lastMessageTime = state.messages.length > 0
    ? formatRelativeTime(state.messages[state.messages.length - 1]!.timestamp)
    : 'N/A'

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
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}> Status </span>
        <span fg={themeColors.textSubtle}>
          v
          {version}
        </span>
      </text>
      <text fg={themeColors.textSubtle}> Enter or Esc to close</text>
      <text style={{ height: 1 }} />

      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Connection</text>
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 16 }}>
          <span fg={themeColors.info}>Status</span>
        </text>
        <text fg={connectionColor}>{connectionStatus}</text>
      </box>
      <text style={{ height: 1 }} />

      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Agent</text>
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 16 }}>
          <span fg={themeColors.info}>Name</span>
        </text>
        <text fg={themeColors.text}>{state.currentAgent?.name ?? 'None selected'}</text>
      </box>
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 16 }}>
          <span fg={themeColors.info}>Available</span>
        </text>
        <text fg={themeColors.text}>
          {state.agents.length}
          {' '}
          agent
          {state.agents.length !== 1 ? 's' : ''}
        </text>
      </box>
      <text style={{ height: 1 }} />

      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Conversation</text>
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 16 }}>
          <span fg={themeColors.info}>Messages</span>
        </text>
        <text fg={themeColors.text}>
          {messageCount}
          {' '}
          total (
          {userMessages}
          {' '}
          you,
          {' '}
          {assistantMessages}
          {' '}
          assistant)
        </text>
      </box>
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 16 }}>
          <span fg={themeColors.info}>Last activity</span>
        </text>
        <text fg={themeColors.text}>{lastMessageTime}</text>
      </box>
      {state.conversationUid && (
        <box flexDirection="row" paddingLeft={1}>
          <text style={{ width: 16 }}>
            <span fg={themeColors.info}>Thread ID</span>
          </text>
          <text fg={themeColors.textSubtle}>
            {state.conversationUid.slice(0, 8)}
            ...
          </text>
        </box>
      )}
      {state.isTyping && (
        <box flexDirection="row" paddingLeft={1}>
          <text style={{ width: 16 }}>
            <span fg={themeColors.info}>Activity</span>
          </text>
          <text fg={themeColors.warning}>Agent is responding...</text>
        </box>
      )}
    </box>
  )
}
