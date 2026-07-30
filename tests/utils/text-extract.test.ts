import type { ChatMessage } from '../../src/chat/chatService'
import { describe, expect, it } from 'bun:test'
import {
  extractLastAssistantText,
  extractMessageText,
  formatTranscript,
} from '../../src/utils/text-extract'

function createMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  options: {
    special?: ChatMessage['special']
  } = {},
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
    ...options,
  }
}

describe('extractMessageText', () => {
  it('extracts text from a user message', () => {
    const message = createMessage('user', 'Hello world')
    expect(extractMessageText(message)).toBe('Hello world')
  })

  it('extracts text from an assistant message', () => {
    const message = createMessage('assistant', 'Hi there!')
    expect(extractMessageText(message)).toBe('Hi there!')
  })

  it('returns empty string for system messages', () => {
    const message = createMessage('system', 'System notification')
    expect(extractMessageText(message)).toBe('')
  })

  it('returns empty string for special guard-agent messages', () => {
    const message = createMessage('assistant', 'Auth cop verdict', {
      special: { type: 'auth_cop', decision: 'approved' },
    })
    expect(extractMessageText(message)).toBe('')
  })

  it('trims whitespace from content', () => {
    const message = createMessage('user', '  spaced text  ')
    expect(extractMessageText(message)).toBe('spaced text')
  })
})

describe('extractLastAssistantText', () => {
  it('returns the last assistant message content', () => {
    const messages = [
      createMessage('user', 'First question'),
      createMessage('assistant', 'First answer'),
      createMessage('user', 'Second question'),
      createMessage('assistant', 'Second answer'),
    ]
    expect(extractLastAssistantText(messages)).toBe('Second answer')
  })

  it('returns undefined when no assistant messages exist', () => {
    const messages = [
      createMessage('user', 'A question'),
      createMessage('system', 'System message'),
    ]
    expect(extractLastAssistantText(messages)).toBeUndefined()
  })

  it('skips assistant messages with empty content', () => {
    const messages = [
      createMessage('assistant', 'Real answer'),
      createMessage('assistant', '   '),
    ]
    expect(extractLastAssistantText(messages)).toBe('Real answer')
  })

  it('skips special guard-agent messages', () => {
    const messages = [
      createMessage('assistant', 'Normal reply'),
      createMessage('assistant', 'Guard verdict', {
        special: { type: 'secret_safe' },
      }),
    ]
    expect(extractLastAssistantText(messages)).toBe('Normal reply')
  })

  it('handles empty message list', () => {
    expect(extractLastAssistantText([])).toBeUndefined()
  })
})

describe('formatTranscript', () => {
  it('formats user and assistant messages', () => {
    const messages = [
      createMessage('user', 'What is 2+2?'),
      createMessage('assistant', '2+2 equals 4.'),
    ]
    const result = formatTranscript(messages)
    expect(result).toContain('# Conversation')
    expect(result).toContain('## User')
    expect(result).toContain('What is 2+2?')
    expect(result).toContain('## Assistant')
    expect(result).toContain('2+2 equals 4.')
  })

  it('excludes system messages by default', () => {
    const messages = [
      createMessage('user', 'Hello'),
      createMessage('system', 'System notice'),
      createMessage('assistant', 'Hi!'),
    ]
    const result = formatTranscript(messages)
    expect(result).not.toContain('System notice')
    expect(result).not.toContain('## System')
  })

  it('includes system messages when option is set', () => {
    const messages = [
      createMessage('user', 'Hello'),
      createMessage('system', 'System notice'),
      createMessage('assistant', 'Hi!'),
    ]
    const result = formatTranscript(messages, { includeSystem: true })
    expect(result).toContain('## System')
    expect(result).toContain('System notice')
  })

  it('excludes special messages by default', () => {
    const messages = [
      createMessage('user', 'Do something'),
      createMessage('assistant', 'Done!'),
      createMessage('assistant', 'Auth verdict', {
        special: { type: 'auth_cop', decision: 'approved' },
      }),
    ]
    const result = formatTranscript(messages)
    expect(result).not.toContain('Auth verdict')
    expect(result).not.toContain('auth_cop')
  })

  it('includes special messages when option is set', () => {
    const messages = [
      createMessage('assistant', 'Done!'),
      createMessage('assistant', 'Auth verdict', {
        special: { type: 'auth_cop', decision: 'approved' },
      }),
    ]
    const result = formatTranscript(messages, { includeSpecial: true })
    expect(result).toContain('Auth verdict')
    expect(result).toContain('## Assistant (auth_cop)')
  })

  it('skips messages with empty content', () => {
    const messages = [
      createMessage('user', 'Hello'),
      createMessage('assistant', '   '),
      createMessage('assistant', 'Real reply'),
    ]
    const result = formatTranscript(messages)
    const assistantMatches = result.match(/## Assistant/g)
    // Should only have one ## Assistant header
    expect(assistantMatches?.length).toBe(1)
  })

  it('handles multiple conversation turns', () => {
    const messages = [
      createMessage('user', 'First question'),
      createMessage('assistant', 'First answer'),
      createMessage('user', 'Second question'),
      createMessage('assistant', 'Second answer'),
      createMessage('user', 'Third question'),
      createMessage('assistant', 'Third answer'),
    ]
    const result = formatTranscript(messages)
    expect(result.match(/## User/g)?.length).toBe(3)
    expect(result.match(/## Assistant/g)?.length).toBe(3)
  })

  it('handles empty message list', () => {
    const result = formatTranscript([])
    expect(result).toBe('# Conversation')
  })

  it('preserves message content formatting', () => {
    const messages = [
      createMessage('assistant', 'Here is some code:\n```js\nconsole.log("hello")\n```'),
    ]
    const result = formatTranscript(messages)
    expect(result).toContain('```js')
    expect(result).toContain('console.log("hello")')
  })
})
