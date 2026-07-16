import { useKeyboard } from '@opentui/react'
import { useCallback, useState } from 'react'

export interface DialogKeyboardOptions {
  /** Total number of selectable items */
  itemCount: number
  /** Callback when the dialog should close */
  onClose: () => void
  /** Callback when an item is selected (Enter pressed) */
  onSelect?: (index: number) => void
  /** Initial selected index (default: 0) */
  initialIndex?: number
  /** Enable vim-style j/k navigation (default: true) */
  enableVimKeys?: boolean
  /** Enable Tab for forward navigation (default: true) */
  enableTab?: boolean
  /** Custom key handler for additional shortcuts */
  onKey?: (key: { name: string, ctrl: boolean, shift: boolean, meta: boolean }) => boolean | void
}

export interface DialogKeyboardResult {
  /** Currently selected index */
  selectedIndex: number
  /** Set the selected index directly */
  setSelectedIndex: (index: number | ((prev: number) => number)) => void
  /** Move selection up */
  moveUp: () => void
  /** Move selection down */
  moveDown: () => void
}

/**
 * Hook for standard dialog/overlay keyboard navigation.
 *
 * Provides:
 * - Escape to close
 * - Up/Down arrow navigation (wrapping)
 * - Optional j/k vim-style navigation
 * - Optional Tab for forward navigation
 * - Enter to select
 *
 * @example
 * ```tsx
 * const { selectedIndex, setSelectedIndex } = useDialogKeyboard({
 *   itemCount: items.length,
 *   onClose: () => setOpen(false),
 *   onSelect: (index) => handleSelect(items[index]),
 * })
 * ```
 */
export function useDialogKeyboard({
  itemCount,
  onClose,
  onSelect,
  initialIndex = 0,
  enableVimKeys = true,
  enableTab = true,
  onKey,
}: DialogKeyboardOptions): DialogKeyboardResult {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  const moveUp = useCallback(() => {
    if (itemCount === 0)
      return
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : itemCount - 1))
  }, [itemCount])

  const moveDown = useCallback(() => {
    if (itemCount === 0)
      return
    setSelectedIndex(prev => (prev < itemCount - 1 ? prev + 1 : 0))
  }, [itemCount])

  useKeyboard((key) => {
    // Allow custom handler to intercept keys first
    if (onKey) {
      const handled = onKey(key)
      if (handled === true) {
        return
      }
    }

    // Escape closes the dialog
    if (key.name === 'escape') {
      onClose()
      return
    }

    // No navigation if empty
    if (itemCount === 0) {
      return
    }

    // Navigation
    if (key.name === 'up' || (enableVimKeys && key.name === 'k')) {
      moveUp()
    }
    else if (key.name === 'down' || (enableVimKeys && key.name === 'j') || (enableTab && key.name === 'tab' && !key.shift)) {
      moveDown()
    }
    else if (enableTab && key.name === 'tab' && key.shift) {
      moveUp()
    }
    else if (key.name === 'return') {
      onSelect?.(selectedIndex)
    }
  })

  return {
    selectedIndex,
    setSelectedIndex,
    moveUp,
    moveDown,
  }
}
