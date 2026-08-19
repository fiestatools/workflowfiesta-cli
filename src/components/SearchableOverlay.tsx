import type { ReactNode } from 'react'
import { TextAttributes } from '@opentui/core'
import { useFuzzyFilter, useSearchKeyboard } from '../hooks'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

export interface SearchableOverlayItem {
  key: string
  label: string
  description?: string
  badge?: string
}

export interface SearchableOverlayProps {
  title: string
  placeholder?: string
  items: SearchableOverlayItem[]
  onSelect: (key: string) => void
  onClose: () => void
  renderItem?: (item: SearchableOverlayItem, isSelected: boolean) => ReactNode
  emptyMessage?: string
  noMatchMessage?: string
  footer?: (filtered: number, total: number) => string
  fullscreen?: boolean
  width?: number | `${number}%`
  height?: number | `${number}%`
}

export function SearchableOverlay({
  title,
  placeholder = 'Search...',
  items,
  onSelect,
  onClose,
  renderItem,
  emptyMessage = 'No items found.',
  noMatchMessage = 'No matching items.',
  footer,
  fullscreen = false,
  width = '90%' as number | `${number}%`,
  height = '80%',
}: SearchableOverlayProps) {
  const { query, setQuery, filtered } = useFuzzyFilter(items)

  const { selectedIndex, scrollRef } = useSearchKeyboard({
    itemCount: filtered.length,
    onClose,
    onSelect: (index) => {
      const item = filtered[index]
      if (item)
        onSelect(item.key)
    },
    onQueryChange: setQuery,
  })

  const footerText = footer
    ? footer(filtered.length, items.length)
    : `${filtered.length} of ${items.length} item(s)`

  return (
    <box
      style={fullscreen
        ? {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 200,
            backgroundColor: SUBTLE_BG,
            border: true,
            borderColor: BRAND_ORANGE,
            flexDirection: 'column',
            paddingX: 2,
            paddingY: 1,
          }
        : {
            position: 'absolute',
            top: '10%',
            left: '5%',
            width,
            height,
            zIndex: 200,
            backgroundColor: SUBTLE_BG,
            border: true,
            borderColor: BRAND_ORANGE,
            flexDirection: 'column',
            paddingX: 2,
            paddingY: 1,
          }}
    >
      <text style={{ flexShrink: 0 }}>
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}>
          {' '}
          {title}
        </span>
        <span fg={themeColors.textSubtle}> · ↑↓ navigate · Enter select · Esc close</span>
      </text>

      <box paddingLeft={1} paddingTop={1} paddingBottom={1} style={{ flexShrink: 0 }}>
        <text>
          <span fg={themeColors.textSubtle}>{'> '}</span>
          <span fg={themeColors.text}>{query}</span>
          <span fg={themeColors.primary}>█</span>
          {!query && (
            <span fg={themeColors.textMuted}>
              {' '}
              {placeholder}
            </span>
          )}
        </text>
      </box>

      <text fg={themeColors.border} style={{ flexShrink: 0 }}>{'─'.repeat(200)}</text>

      <scrollbox ref={scrollRef} flexGrow={1} contentOptions={{ flexDirection: 'column' }} stickyScroll={false} paddingTop={1}>
        {filtered.length === 0
          ? (
              <text fg={themeColors.textMuted} paddingLeft={1}>
                {items.length === 0 ? emptyMessage : noMatchMessage}
              </text>
            )
          : (
              filtered.map((item, index) => {
                const isSelected = index === selectedIndex
                if (renderItem) {
                  return <box key={item.key}>{renderItem(item, isSelected)}</box>
                }
                return (
                  <box key={item.key} flexDirection="row" paddingLeft={1} paddingBottom={1}>
                    <text style={{ width: 2 }}>
                      <span fg={isSelected ? themeColors.primary : themeColors.text}>
                        {isSelected ? '▸' : ' '}
                      </span>
                    </text>
                    <box flexDirection="column" flexGrow={1}>
                      <text>
                        <span
                          fg={isSelected ? themeColors.primary : themeColors.text}
                          attributes={isSelected ? TextAttributes.BOLD : undefined}
                        >
                          {item.label}
                        </span>
                        {item.badge && (
                          <span fg={themeColors.textSubtle}>
                            {' '}
                            {item.badge}
                          </span>
                        )}
                      </text>
                      {item.description && (
                        <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>
                          {item.description}
                        </text>
                      )}
                    </box>
                  </box>
                )
              })
            )}
      </scrollbox>

      <text fg={themeColors.border}>{'─'.repeat(200)}</text>
      <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM} paddingLeft={1} style={{ height: 1, flexShrink: 0 }}>
        {footerText}
      </text>
    </box>
  )
}
