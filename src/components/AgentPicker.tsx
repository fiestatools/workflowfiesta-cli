import type { AgentSummary } from '../runs'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useState } from 'react'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

/** Props for the agent picker overlay. */
export interface AgentPickerProps {
  agents: AgentSummary[]
  currentAgentId?: string
  onSelect: (agentId: string) => void
  onClose: () => void
  /** Heading shown at the top of the overlay. */
  title?: string
  /**
   * When provided, a leading "Use account default" row is shown that clears any
   * local pin (used by settings; omitted for the per-conversation `/agent`
   * switch). Selecting it invokes this instead of {@link AgentPickerProps.onSelect}.
   */
  onUseDefault?: () => void
  /** Name of the account default agent, shown beside the default row. */
  defaultAgentName?: string
}

/**
 * Overlay for choosing an agent. By default it applies the selection to the
 * current thread (the `/agent` switch). When {@link AgentPickerProps.onUseDefault}
 * is provided it doubles as the settings default-agent picker, with a leading
 * row to fall back to the account default. Mirrors the extension's agent picker.
 */
export function AgentPicker({
  agents,
  currentAgentId,
  onSelect,
  onClose,
  title = 'Select agent',
  onUseDefault,
  defaultAgentName,
}: AgentPickerProps) {
  const hasDefaultRow = Boolean(onUseDefault)
  const offset = hasDefaultRow ? 1 : 0
  const rowCount = agents.length + offset

  const agentIndex = agents.findIndex(a => a.uid === currentAgentId)
  // With no pin (using account default), highlight the default row; otherwise
  // highlight the pinned agent.
  const initial = agentIndex >= 0 ? agentIndex + offset : 0
  const [selectedIndex, setSelectedIndex] = useState(initial)

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose()
      return
    }
    if (rowCount === 0)
      return

    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : rowCount - 1))
    }
    else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') {
      setSelectedIndex(prev => (prev < rowCount - 1 ? prev + 1 : 0))
    }
    else if (key.name === 'return') {
      if (hasDefaultRow && selectedIndex === 0) {
        onUseDefault?.()
        onClose()
        return
      }
      const agent = agents[selectedIndex - offset]
      if (agent) {
        onSelect(agent.uid)
        onClose()
      }
    }
  })

  // The default row counts as "current" only when nothing is pinned.
  const defaultRowIsCurrent = hasDefaultRow && !currentAgentId

  return (
    <box
      style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        zIndex: 100,
        backgroundColor: SUBTLE_BG,
        border: true,
        borderColor: BRAND_ORANGE,
        flexDirection: 'column',
        padding: 1,
      }}
    >
      <text>
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}>
          {' '}
          {title}
        </span>
      </text>
      <text fg={themeColors.textSubtle}> ↑↓ to move · Enter to select · Esc to close</text>
      <text style={{ height: 1 }} />

      {hasDefaultRow && (
        <box flexDirection="row" paddingLeft={1}>
          <text style={{ width: 2 }}>
            <span fg={selectedIndex === 0 ? themeColors.primary : themeColors.text}>{selectedIndex === 0 ? '▸' : ' '}</span>
          </text>
          <box flexDirection="column" flexGrow={1}>
            <text>
              <span fg={selectedIndex === 0 ? themeColors.primary : themeColors.info} attributes={selectedIndex === 0 ? TextAttributes.BOLD : undefined}>
                Use account default
              </span>
              {defaultRowIsCurrent && <span fg={themeColors.success}> (current)</span>}
            </text>
            {defaultAgentName && (
              <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>{defaultAgentName}</text>
            )}
          </box>
        </box>
      )}

      {agents.length === 0
        ? (
            <text fg={themeColors.textMuted} paddingLeft={1}>
              No agents available. Create one in the web app first.
            </text>
          )
        : (
            agents.map((agent, index) => {
              const rowIndex = index + offset
              const isSelected = rowIndex === selectedIndex
              const isCurrent = agent.uid === currentAgentId
              return (
                <box key={agent.uid} flexDirection="row" paddingLeft={1}>
                  <text style={{ width: 2 }}>
                    <span fg={isSelected ? themeColors.primary : themeColors.text}>{isSelected ? '▸' : ' '}</span>
                  </text>
                  <box flexDirection="column" flexGrow={1}>
                    <text>
                      <span fg={isSelected ? themeColors.primary : themeColors.text} attributes={isSelected ? TextAttributes.BOLD : undefined}>
                        {agent.name}
                      </span>
                      {isCurrent && <span fg={themeColors.success}> (current)</span>}
                    </text>
                    {agent.description && (
                      <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>{agent.description}</text>
                    )}
                  </box>
                </box>
              )
            })
          )}
    </box>
  )
}
