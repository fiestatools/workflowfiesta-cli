import type { ExtmarksController, KeyEvent, PasteEvent, TextareaRenderable } from '@opentui/core'
import type { PasteExpandRange } from '../utils/paste-summary'
import { decodePasteBytes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import { useCallback, useEffect, useRef } from 'react'
import { themeColors } from '../theme'
import { readFromClipboard } from '../utils/clipboard'
import {
  formatPastePlaceholder,
  normalizeLineEndings,
  pasteLineCount,
  shouldSummarizePaste,
} from '../utils/paste-summary'
import { promptOffsetWidth } from '../utils/prompt-display'

/** Props for the input area. */
export interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (getExtmarkRanges?: () => PasteExpandRange[]) => void
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

  // Track paste parts: extmark ID -> original text mapping
  const pastePartsRef = useRef<Map<number, { originalText: string, placeholderText: string }>>(new Map())
  // Type ID for paste extmarks (registered once per textarea instance)
  const pasteTypeIdRef = useRef<number | null>(null)

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

  /**
   * Get the extmarks controller and ensure the paste type is registered.
   */
  const getExtmarks = useCallback((): ExtmarksController | null => {
    const ref = textareaRef.current
    if (!ref)
      return null

    const extmarks = ref.extmarks
    if (!extmarks)
      return null

    // Register the paste type if not already done
    if (pasteTypeIdRef.current === null) {
      pasteTypeIdRef.current = extmarks.registerType('paste')
    }

    return extmarks
  }, [])

  /**
   * Get paste expand ranges from current extmarks.
   * Used by submit to expand placeholders back to original text.
   */
  const getExtmarkRanges = useCallback((): PasteExpandRange[] => {
    const extmarks = getExtmarks()
    if (!extmarks || pasteTypeIdRef.current === null)
      return []

    const ranges: PasteExpandRange[] = []
    const pasteExtmarks = extmarks.getAllForTypeId(pasteTypeIdRef.current)

    for (const extmark of pasteExtmarks) {
      const part = pastePartsRef.current.get(extmark.id)
      if (part) {
        ranges.push({
          start: extmark.start,
          end: extmark.end,
          text: part.originalText,
        })
      }
    }

    return ranges
  }, [getExtmarks])

  /**
   * Insert pasted text with optional summarization.
   */
  const pasteInputText = useCallback(async (text: string) => {
    const ref = textareaRef.current
    if (!ref)
      return

    const normalizedText = normalizeLineEndings(text)
    const trimmedContent = normalizedText.trim()

    if (!trimmedContent)
      return

    const lineCount = pasteLineCount(trimmedContent)

    // Check if we should summarize
    if (shouldSummarizePaste(trimmedContent)) {
      const placeholderText = formatPastePlaceholder(lineCount)
      const extmarks = getExtmarks()

      if (extmarks && pasteTypeIdRef.current !== null) {
        // Get current cursor position (we'll insert at the cursor)
        const cursorOffset = ref.cursorOffset

        // Insert the placeholder text followed by a space
        ref.insertText(`${placeholderText} `)

        // Create an extmark over the placeholder (not including the trailing space)
        const extmarkStart = cursorOffset
        const extmarkEnd = cursorOffset + promptOffsetWidth(placeholderText)

        const extmarkId = extmarks.create({
          start: extmarkStart,
          end: extmarkEnd,
          virtual: true,
          typeId: pasteTypeIdRef.current,
        })

        // Store the mapping
        pastePartsRef.current.set(extmarkId, {
          originalText: trimmedContent,
          placeholderText,
        })

        return
      }
    }

    // Short text or no extmarks support - insert verbatim
    ref.insertText(normalizedText)
  }, [getExtmarks])

  /**
   * Handle bracketed paste events from the terminal.
   */
  const handlePaste = useCallback((event: PasteEvent) => {
    if (isDisabled) {
      event.preventDefault?.()
      return
    }

    // Decode raw bytes to string
    const text = decodePasteBytes(event.bytes)

    // Prevent default paste handling - we'll handle it ourselves
    event.preventDefault?.()

    void pasteInputText(text)
  }, [isDisabled, pasteInputText])

  /**
   * Handle Ctrl+V paste from clipboard (fallback for terminals without bracketed paste).
   */
  const handleCtrlVPaste = useCallback(async () => {
    if (isDisabled)
      return

    const content = await readFromClipboard()
    if (content) {
      await pasteInputText(content)
    }
  }, [isDisabled, pasteInputText])

  // Sync textarea value when controlled value changes externally (e.g., cleared after submit)
  useEffect(() => {
    const ref = textareaRef.current
    if (ref && ref.plainText !== value) {
      ref.setText(value)
      // Clear paste parts when the input is cleared externally
      if (value === '') {
        pastePartsRef.current.clear()
        const extmarks = getExtmarks()
        if (extmarks) {
          extmarks.clear()
        }
      }
    }
  }, [value, getExtmarks])

  const handleKeyDown = (event: KeyEvent) => {
    const isEnterEvent = event.name === 'return' || event.name === 'linefeed'

    // Skip history navigation when input is disabled (e.g., dialog/modal is open)
    // This allows dialogs to handle up/down arrow keys for their own navigation
    if (isDisabled) {
      return
    }

    // Handle Ctrl+V paste
    if (event.ctrl && event.name === 'v') {
      event.preventDefault()
      event.stopPropagation()
      void handleCtrlVPaste()
      return
    }

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
        onSubmit(getExtmarkRanges)
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
        onPaste={handlePaste}
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
