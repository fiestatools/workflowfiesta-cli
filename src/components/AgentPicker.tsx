import type { AgentSummary } from '../runs'
import { TextAttributes } from '@opentui/core'
import { useDialogKeyboard } from '../hooks'
import { themeColors } from '../theme'
import { OverlayContainer } from './OverlayContainer'
import { SelectableRow } from './SelectableRow'

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

  const { selectedIndex } = useDialogKeyboard({
    itemCount: rowCount,
    onClose,
    onSelect: (index) => {
      if (hasDefaultRow && index === 0) {
        onUseDefault?.()
        onClose()
        return
      }
      const agent = agents[index - offset]
      if (agent) {
        onSelect(agent.uid)
        onClose()
      }
    },
    initialIndex: initial,
  })

  // The default row counts as "current" only when nothing is pinned.
  const defaultRowIsCurrent = hasDefaultRow && !currentAgentId

  return (
    <OverlayContainer
      title={title}
      helpText="↑↓ to move · Enter to select · Esc to close"
    >
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
                <SelectableRow
                  key={agent.uid}
                  isSelected={isSelected}
                  label={agent.name}
                  sublabel={agent.description}
                  badge={isCurrent ? '(current)' : undefined}
                />
              )
            })
          )}
    </OverlayContainer>
  )
}
