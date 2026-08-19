import type { ScrollBoxRenderable } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useEffect, useRef, useState } from 'react'

export interface UseSearchKeyboardOptions {
  itemCount: number
  onClose: () => void
  onSelect: (index: number) => void
  onQueryChange: (query: string | ((prev: string) => string)) => void
  itemHeight?: number
}

export interface UseSearchKeyboardResult {
  selectedIndex: number
  scrollRef: React.RefObject<ScrollBoxRenderable | null>
}

export function useSearchKeyboard({
  itemCount,
  onClose,
  onSelect,
  onQueryChange,
  itemHeight = 3,
}: UseSearchKeyboardOptions): UseSearchKeyboardResult {
  const [rawIndex, setRawIndex] = useState(0)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  // Clamp at render time — no effect needed
  const selectedIndex = itemCount === 0
    ? 0
    : Math.min(rawIndex, itemCount - 1)

  useEffect(() => {
    const scrollBox = scrollRef.current
    if (!scrollBox)
      return
    const itemTop = selectedIndex * itemHeight
    const itemBottom = itemTop + itemHeight
    if (itemTop < scrollBox.scrollTop) {
      scrollBox.scrollTop = itemTop
    }
    else if (itemBottom > scrollBox.scrollTop + scrollBox.height) {
      scrollBox.scrollTop = itemBottom - scrollBox.height
    }
  }, [selectedIndex, itemHeight])

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose()
      return
    }

    if (key.name === 'up') {
      setRawIndex(prev => (prev > 0 ? prev - 1 : itemCount - 1))
      return
    }

    if (key.name === 'down' || (key.name === 'tab' && !key.shift)) {
      setRawIndex(prev => (prev < itemCount - 1 ? prev + 1 : 0))
      return
    }

    if (key.name === 'tab' && key.shift) {
      setRawIndex(prev => (prev > 0 ? prev - 1 : itemCount - 1))
      return
    }

    if (key.name === 'return') {
      if (itemCount > 0) {
        onSelect(selectedIndex)
      }
      return
    }

    if (key.name === 'backspace' || key.name === 'delete') {
      onQueryChange(prev => prev.slice(0, -1))
      setRawIndex(0)
      return
    }

    if (!key.ctrl && !key.meta) {
      const seq = key.sequence
      if (seq && seq.length === 1) {
        const code = seq.charCodeAt(0)
        if (code >= 32 && code !== 127) {
          onQueryChange(prev => prev + seq)
          setRawIndex(0)
        }
      }
    }
  })

  return { selectedIndex, scrollRef }
}
