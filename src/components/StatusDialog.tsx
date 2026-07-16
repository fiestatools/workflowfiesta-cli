import type { ChatState } from '../chat'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { themeColors } from '../theme'
import { getConnectionStatus } from '../utils/connectionStatus'
import { formatRelativeTime } from '../utils/dateFormatters'
import { OverlayContainer } from './OverlayContainer'

/** Props for the status dialog overlay. */
export interface StatusDialogProps {
  state: ChatState
  version: string
  onClose: () => void
}

/** Status overlay showing current connection, agent, and conversation info. */
export function StatusDialog({ state, version, onClose }: StatusDialogProps) {
  useKeyboard((key) => {
    if (key.name === 'escape' || key.name === 'return') {
      onClose()
    }
  })

  const { text: connectionText, color: connectionColor } = getConnectionStatus(state)

  const messageCount = state.messages.length
  const userMessages = state.messages.filter(m => m.role === 'user').length
  const assistantMessages = state.messages.filter(m => m.role === 'assistant').length

  const lastMessageTime = state.messages.length > 0
    ? formatRelativeTime(state.messages[state.messages.length - 1]!.timestamp)
    : 'N/A'

  return (
    <OverlayContainer
      title="Status"
      subtitle={`v${version}`}
      helpText="Enter or Esc to close"
    >
      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Connection</text>
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 16 }}>
          <span fg={themeColors.info}>Status</span>
        </text>
        <text fg={connectionColor}>{connectionText}</text>
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
    </OverlayContainer>
  )
}
