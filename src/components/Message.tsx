import type { ChatMessage } from '../chat'
import { TextAttributes } from '@opentui/core'
import { SUBTLE_BG, themeColors } from '../theme'
import { LoadingSpinner } from './LoadingSpinner'
import { MarkdownText } from './MarkdownText'
import { ToolActivity } from './ToolActivity'

/** Props for a single message. */
export interface MessageProps {
  message: ChatMessage
}

/** Format timestamp for display (HH:MM format). */
function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Single chat message display. */
export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const isAssistant = message.role === 'assistant'

  const roleColor = isUser
    ? themeColors.user
    : isSystem
      ? themeColors.system
      : themeColors.assistant

  const roleLabel = isUser ? 'You' : isSystem ? 'System' : 'Assistant'
  const timestamp = formatTimestamp(message.timestamp)

  return (
    <box
      flexDirection="column"
      paddingX={1}
      paddingY={isAssistant ? 1 : 0}
      marginBottom={1}
      backgroundColor={isAssistant ? SUBTLE_BG : undefined}
    >
      <box flexDirection="row">
        <text attributes={TextAttributes.BOLD}>
          <span fg={roleColor}>{roleLabel}</span>
          {' '}
        </text>
        <text attributes={TextAttributes.DIM}>
          <span fg={themeColors.textSubtle}>{timestamp}</span>
          {' '}
        </text>
        {message.isStreaming && <LoadingSpinner />}
      </box>
      {/* Tool/thinking activity renders above the final text, as in web & extension. */}
      {message.toolEvents && message.toolEvents.length > 0 && (
        <box paddingLeft={2} marginTop={1}>
          <ToolActivity toolEvents={message.toolEvents} />
        </box>
      )}
      <box paddingLeft={2}>
        {isAssistant && message.content
          ? (
              <MarkdownText content={message.content} streaming={message.isStreaming} />
            )
          : (
              <text>{message.content || ''}</text>
            )}
      </box>
    </box>
  )
}
