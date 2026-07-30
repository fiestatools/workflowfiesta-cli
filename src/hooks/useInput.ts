import type { ChatService } from '../chat'
import type { PasteExpandRange } from '../utils/paste-summary'
import { useCallback, useRef, useState } from 'react'
import { expandTrackedPastedText } from '../utils/paste-summary'

/**
 * A tracked pasted text part, storing the original content and its placeholder.
 */
export interface TrackedPastePart {
  extmarkId: number
  originalText: string
  placeholderText: string
}

/**
 * Hook to manage input state with history navigation and paste tracking.
 */
export function useInput(chatService: ChatService) {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // History of submitted inputs (most recent last)
  const historyRef = useRef<string[]>([])
  // Current position in history (-1 means not navigating, typing new input)
  const historyIndexRef = useRef(-1)
  // Store the current draft when navigating history
  const draftRef = useRef('')
  // Track if we're currently navigating (to avoid resetting on setInput)
  const isNavigatingRef = useRef(false)

  const pastePartsRef = useRef<TrackedPastePart[]>([])

  const addPastePart = useCallback((part: TrackedPastePart) => {
    pastePartsRef.current.push(part)
  }, [])

  /**
   * Clear all tracked paste parts (called after submit or clear).
   */
  const clearPasteParts = useCallback(() => {
    pastePartsRef.current = []
  }, [])

  /**
   * Get all tracked paste parts.
   */
  const getPasteParts = useCallback(() => {
    return pastePartsRef.current
  }, [])

  /**
   * Remove a paste part by extmark ID (e.g., when user deletes the placeholder).
   */
  const removePastePart = useCallback((extmarkId: number) => {
    pastePartsRef.current = pastePartsRef.current.filter(p => p.extmarkId !== extmarkId)
  }, [])

  const handleSubmit = useCallback(async (
    getExtmarkRanges?: () => PasteExpandRange[],
  ) => {
    if (!input.trim() || isSubmitting)
      return

    setIsSubmitting(true)
    try {
      // Expand any paste placeholders before sending
      let finalText = input
      if (getExtmarkRanges) {
        const ranges = getExtmarkRanges()
        if (ranges.length > 0) {
          finalText = expandTrackedPastedText(input, ranges)
        }
      }

      await chatService.sendMessage(finalText)

      // Add to history (avoid duplicates of the last entry)
      // Store the expanded text in history for accurate recall
      if (historyRef.current[historyRef.current.length - 1] !== finalText.trim()) {
        historyRef.current.push(finalText.trim())
      }
      // Reset history navigation state
      historyIndexRef.current = -1
      draftRef.current = ''
      // Clear paste parts after successful submit
      clearPasteParts()
      setInput('')
    }
    finally {
      setIsSubmitting(false)
    }
  }, [input, isSubmitting, chatService, clearPasteParts])

  /**
   * Navigate to the previous input in history (older).
   * Returns the new input value, or undefined if no history available.
   */
  const navigateHistoryUp = useCallback((): string | undefined => {
    const history = historyRef.current
    if (history.length === 0)
      return undefined

    // If we're not navigating yet, save the current draft and start from the end
    if (historyIndexRef.current === -1) {
      draftRef.current = input
      historyIndexRef.current = history.length - 1
    }
    else if (historyIndexRef.current > 0) {
      // Move to older entry
      historyIndexRef.current -= 1
    }
    else {
      // Already at the oldest entry
      return undefined
    }

    const newValue = history[historyIndexRef.current]!
    isNavigatingRef.current = true
    setInput(newValue)
    return newValue
  }, [input])

  /**
   * Navigate to the next input in history (newer).
   * Returns the new input value, or undefined if already at the draft.
   */
  const navigateHistoryDown = useCallback((): string | undefined => {
    const history = historyRef.current

    // Not navigating history
    if (historyIndexRef.current === -1)
      return undefined

    if (historyIndexRef.current < history.length - 1) {
      // Move to newer entry
      historyIndexRef.current += 1
      const newValue = history[historyIndexRef.current]!
      isNavigatingRef.current = true
      setInput(newValue)
      return newValue
    }
    else {
      // Return to the draft
      historyIndexRef.current = -1
      const newValue = draftRef.current
      isNavigatingRef.current = true
      setInput(newValue)
      return newValue
    }
  }, [])

  /**
   * Reset history navigation (call when user types manually).
   * Returns true if reset was performed, false if it was skipped due to navigation.
   */
  const resetHistoryNavigation = useCallback((): boolean => {
    // Skip reset if this was triggered by history navigation itself
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false
      return false
    }
    historyIndexRef.current = -1
    draftRef.current = ''
    return true
  }, [])

  return {
    input,
    setInput,
    isSubmitting,
    handleSubmit,
    navigateHistoryUp,
    navigateHistoryDown,
    resetHistoryNavigation,
    // Paste tracking
    addPastePart,
    clearPasteParts,
    getPasteParts,
    removePastePart,
  }
}
