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
}

/**
 * Overlay for choosing which agent the current thread runs. Lists the org's
 * agents, highlights the active one, and applies the selection immediately.
 * Mirrors the extension's agent picker.
 */
export function AgentPicker({ agents, currentAgentId, onSelect, onClose }: AgentPickerProps) {
  const initial = Math.max(0, agents.findIndex(a => a.uid === currentAgentId))
  const [selectedIndex, setSelectedIndex] = useState(initial)

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose()
      return
    }
    if (agents.length === 0)
      return

    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : agents.length - 1))
    }
    else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') {
      setSelectedIndex(prev => (prev < agents.length - 1 ? prev + 1 : 0))
    }
    else if (key.name === 'return') {
      const agent = agents[selectedIndex]
      if (agent) {
        onSelect(agent.uid)
        onClose()
      }
    }
  })

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
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}> Select agent</span>
      </text>
      <text fg={themeColors.textSubtle}> ↑↓ to move · Enter to select · Esc to close</text>
      <text style={{ height: 1 }} />

      {agents.length === 0
        ? (
            <text fg={themeColors.textMuted} paddingLeft={1}>
              No agents available. Create one in the web app first.
            </text>
          )
        : (
            agents.map((agent, index) => {
              const isSelected = index === selectedIndex
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
