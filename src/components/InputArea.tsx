import type { KeyEvent, TextareaRenderable } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import { useEffect, useRef } from 'react'
import { themeColors } from '../theme'

/** Props for the input area. */
export interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isDisabled: boolean
  isStreaming?: boolean
  placeholder?: string
  /** When true (input is a `/command`), Enter is left to the command palette. */
  isCommandMode?: boolean
  /** Navigate to older input in history (up arrow). */
  onHistoryUp?: () => string | undefined
  /** Navigate to newer input in history (down arrow). */
  onHistoryDown?: () => string | undefined
  /** Reset history navigation when user types. */
  onHistoryReset?: () => void
}

/** Input area for typing messages with multiline support. */
export function InputArea({
  value,
  onChange,
  onSubmit,
  isDisabled,
  isStreaming = false,
  placeholder,
  isCommandMode = false,
  onHistoryUp,
  onHistoryDown,
  onHistoryReset,
}: InputAreaProps) {
  const terminalDimensions = useTerminalDimensions()
  const textareaRef = useRef<TextareaRenderable | null>(null)

  const getAvailableWidth = () => {
    const width = terminalDimensions.width
    // Account for border (2) and padding (2)
    return Math.max(1, width - 4)
  }

  const getLineCount = (text: string) => {
    const availableWidth = getAvailableWidth()
    if (text.length === 0)
      return 1
    return text
      .split('\n')
      .map(line => Math.max(1, Math.ceil((line.length || 1) / availableWidth)))
      .reduce((sum, lineCount) => sum + lineCount, 0)
  }

  const getMaxVisibleLineCount = () => {
    const byRatio = Math.floor(terminalDimensions.height * 0.25)
    const byScreen = Math.max(3, terminalDimensions.height - 10)
    return Math.max(3, Math.min(12, byRatio, byScreen))
  }

  const lineCount = getLineCount(value)
  const maxVisibleLineCount = getMaxVisibleLineCount()
  const visibleLineCount = Math.min(lineCount, maxVisibleLineCount)
  // Add 2 for border
  const boxHeight = visibleLineCount + 2

  const getPlaceholder = () => {
    if (isDisabled)
      return 'Waiting...'
    if (isStreaming)
      return 'Press Esc to cancel...'
    return placeholder ?? 'Type a message... (Enter to send, Shift+Enter for newline)'
  }

  // Sync textarea value when controlled value changes externally (e.g., cleared after submit)
  useEffect(() => {
    const ref = textareaRef.current
    if (ref && ref.plainText !== value) {
      ref.setText(value)
    }
  }, [value])

  const handleKeyDown = (event: KeyEvent) => {
    const isEnterEvent = event.name === 'return' || event.name === 'linefeed'

    // Up arrow: navigate to older history entry (only when input is single-line or cursor is at start)
    if (event.name === 'up' && onHistoryUp) {
      // Only navigate history if input is empty or single-line (no newlines)
      if (!value.includes('\n')) {
        event.preventDefault()
        event.stopPropagation()
        onHistoryUp()
        return
      }
    }

    // Down arrow: navigate to newer history entry (only when input is single-line or cursor is at end)
    if (event.name === 'down' && onHistoryDown) {
      // Only navigate history if input is empty or single-line (no newlines)
      if (!value.includes('\n')) {
        event.preventDefault()
        event.stopPropagation()
        onHistoryDown()
        return
      }
    }

    if (isEnterEvent) {
      // Shift+Enter = insert newline manually
      if (event.shift) {
        event.preventDefault()
        event.stopPropagation()
        const ref = textareaRef.current
        if (ref) {
          ref.newLine()
        }
        return
      }

      // While typing a /command, the command palette owns Enter — don't submit
      // the raw text as a message (and don't insert a newline).
      if (isCommandMode) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      // Ctrl+Enter or plain Enter = submit
      if (!isDisabled && value.trim()) {
        event.preventDefault()
        event.stopPropagation()
        onSubmit()
      }
    }
  }

  const handleContentChange = () => {
    const ref = textareaRef.current
    if (ref) {
      onChange(ref.plainText)
      // Reset history navigation when user types manually
      onHistoryReset?.()
    }
  }

  return (
    <box
      style={{
        border: true,
        borderColor: themeColors.primary,
        height: boxHeight,
        width: '100%',
      }}
      paddingX={1}
    >
      <textarea
        ref={(r: TextareaRenderable) => {
          textareaRef.current = r
        }}
        initialValue={value}
        wrapMode="char"
        placeholder={getPlaceholder()}
        focused={!isDisabled}
        onContentChange={handleContentChange}
        onKeyDown={handleKeyDown}
        textColor={themeColors.text}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        focusedTextColor={themeColors.text}
        cursorColor={themeColors.primary}
        scrollMargin={1}
        scrollSpeed={2}
        style={{
          width: '100%',
          height: visibleLineCount,
          minHeight: 1,
        }}
      />
    </box>
  )
}
