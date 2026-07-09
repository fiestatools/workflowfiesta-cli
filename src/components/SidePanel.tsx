import type { ChatState } from '../chat'
import { TextAttributes } from '@opentui/core'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { truncateText } from '../utils/truncateText'
import { Divider } from './Divider'

/** Width of the side panel in characters. */
export const SIDE_PANEL_WIDTH = 32

/** CLI version - uses build-time constant or falls back to dev */
const CLI_VERSION = typeof WF_VERSION !== 'undefined' ? `v${WF_VERSION}` : 'dev'

/** Props for the SidePanel component. */
export interface SidePanelProps {
  state: ChatState
  isVisible: boolean
}

/** Side panel component showing session/context info. */
export function SidePanel({ state, isVisible }: SidePanelProps) {
  if (!isVisible) {
    return null
  }

  const userMessageCount = state.messages.filter(m => m.role === 'user').length
  const assistantMessageCount = state.messages.filter(m => m.role === 'assistant').length

  // Derive conversation title from first user message or use default
  const firstUserMessage = state.messages.find(m => m.role === 'user')
  const conversationTitle = firstUserMessage
    ? truncateText(firstUserMessage.content, 26)
    : 'New Conversation'

  // Connection status
  const connectionStatus = state.isConnecting
    ? { text: 'connecting', color: themeColors.warning }
    : state.isConnected
      ? { text: 'connected', color: themeColors.primary }
      : { text: 'disconnected', color: themeColors.textMuted }

  // Agent status
  const agentName = state.currentAgent?.name ?? 'No agent'
  const agentStatus = state.isTyping ? 'working...' : 'ready'
  const agentStatusColor = state.isTyping ? themeColors.warning : themeColors.primary

  return (
    <box
      flexDirection="column"
      width={SIDE_PANEL_WIDTH}
      paddingX={1}
      paddingY={1}
      borderStyle="single"
      borderColor={BRAND_ORANGE}
      backgroundColor={SUBTLE_BG}
      shouldFill={true}
    >
      {/* Conversation Section */}
      <text attributes={TextAttributes.DIM}>Conversation</text>
      <text>{conversationTitle}</text>
      <text attributes={TextAttributes.DIM}>
        {userMessageCount}
        {' '}
        /
        {' '}
        {assistantMessageCount}
        {' '}
        messages
      </text>
      <Divider />

      {/* Agent Section */}
      <text attributes={TextAttributes.DIM}>Agent</text>
      <text>{truncateText(agentName, 26)}</text>
      <text fg={agentStatusColor}>{agentStatus}</text>
      <Divider />

      {/* Connection */}
      <text>
        <span fg={themeColors.textMuted}>status </span>
        <span fg={connectionStatus.color}>{connectionStatus.text}</span>
      </text>

      {/* Spacer to push footer to bottom */}
      <box flexGrow={1} />

      {/* Footer with keyboard hints */}
      <Divider />
      <text attributes={TextAttributes.DIM}>^S settings  ^N new</text>
      <text attributes={TextAttributes.DIM}>^B panel     ^C quit</text>
      <Divider />
      <text fg={themeColors.textSubtle}>{CLI_VERSION}</text>
    </box>
  )
}
