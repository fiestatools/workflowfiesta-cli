import { TextAttributes } from '@opentui/core';
import type { ChatState } from '../chat';
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme';

/** Width of the side panel in characters. */
export const SIDE_PANEL_WIDTH = 32;

/** Props for the SidePanel component. */
export interface SidePanelProps {
  state: ChatState;
  isVisible: boolean;
}

/** Divider component. */
function Divider() {
  return <text fg={themeColors.textSubtle}>{'─'.repeat(SIDE_PANEL_WIDTH - 4)}</text>;
}

/** Side panel component showing session/context info. */
export function SidePanel({ state, isVisible }: SidePanelProps) {
  if (!isVisible) {
    return null;
  }

  const userMessageCount = state.messages.filter(m => m.role === 'user').length;
  const assistantMessageCount = state.messages.filter(m => m.role === 'assistant').length;

  // Derive conversation title from first user message or use default
  const firstUserMessage = state.messages.find(m => m.role === 'user');
  const conversationTitle = firstUserMessage
    ? truncateText(firstUserMessage.content, 26)
    : 'New Conversation';

  // Connection status
  const connectionStatus = state.isConnecting
    ? { text: 'connecting', color: themeColors.warning }
    : state.isConnected
    ? { text: 'connected', color: themeColors.primary }
    : { text: 'disconnected', color: themeColors.textMuted };

  // Agent status
  const agentName = state.currentAgent?.name ?? 'No agent';
  const agentStatus = state.isTyping ? 'working...' : 'ready';
  const agentStatusColor = state.isTyping ? themeColors.warning : themeColors.primary;

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
      <text attributes={TextAttributes.DIM}>{userMessageCount} / {assistantMessageCount} messages</text>
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
    </box>
  );
}

/** Truncate text with ellipsis if too long. */
function truncateText(text: string, maxLength: number): string {
  // Remove newlines and extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.slice(0, maxLength - 1) + '…';
}
