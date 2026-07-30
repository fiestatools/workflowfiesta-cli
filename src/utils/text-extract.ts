import type { ChatMessage } from '../chat/chatService'

export function extractMessageText(message: ChatMessage): string {
  if (message.role === 'system' || message.special) {
    return ''
  }
  return message.content.trim()
}

export function extractLastAssistantText(messages: ChatMessage[]): string | undefined {
  const lastAssistant = [...messages]
    .reverse()
    .find(m => m.role === 'assistant' && !m.special && m.content.trim())
  return lastAssistant?.content.trim()
}

export interface FormatTranscriptOptions {
  includeSystem?: boolean
  includeSpecial?: boolean
}

/**
 * Format a conversation as a copyable plaintext transcript.
 *
 * Output format:
 * ```
 * # Conversation
 *
 * ## User
 * <user message>
 *
 * ## Assistant
 * <assistant message>
 * ...
 * ```
 */
export function formatTranscript(
  messages: ChatMessage[],
  options: FormatTranscriptOptions = {},
): string {
  const lines: string[] = ['# Conversation', '']

  for (const message of messages) {
    if (message.role === 'system' && !options.includeSystem) {
      continue
    }

    // Skip special guard-agent verdicts unless explicitly requested
    if (message.special && !options.includeSpecial) {
      continue
    }

    const content = message.content.trim()
    if (!content) {
      continue
    }

    if (message.role === 'user') {
      lines.push('## User', '')
      lines.push(content, '')
    }
    else if (message.role === 'assistant') {
      const header = message.special
        ? `## Assistant (${message.special.type})`
        : '## Assistant'
      lines.push(header, '')
      lines.push(content, '')
    }
    else if (message.role === 'system' && options.includeSystem) {
      lines.push('## System', '')
      lines.push(content, '')
    }
  }

  return lines.join('\n').trimEnd()
}
