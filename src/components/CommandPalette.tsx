import type { Command } from '../commands'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'

import { useEffect, useMemo, useState } from 'react'
import { COMMANDS, filterCommands } from '../commands'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

/** Props for the CommandPalette component. */
export interface CommandPaletteProps {
  /** Current input value (including the leading /). */
  input: string
  /** Called when a command is selected for execution. */
  onExecute: (command: Command) => void
  /** Called when the palette should close (escape pressed). */
  onClose: () => void
  /** Called when input should be updated (tab completion). */
  onInputChange: (value: string) => void
}

/** Command palette overlay for / commands. */
export function CommandPalette({ input, onExecute, onClose, onInputChange }: CommandPaletteProps) {
  // Extract query from input (remove leading /)
  const query = input.startsWith('/') ? input.slice(1).toLowerCase().trim() : ''

  const filteredCommands = useMemo(() => {
    if (!query)
      return COMMANDS
    return filterCommands(query)
  }, [query])

  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredCommands.length === 0)
        return 0
      if (prev >= filteredCommands.length)
        return filteredCommands.length - 1
      return prev < 0 ? 0 : prev
    })
  }, [filteredCommands.length])

  // Get display label with alias if it matches
  const getDisplayLabel = (cmd: Command) => {
    const isAliasMatch = cmd.alias?.toLowerCase().startsWith(query)
    return isAliasMatch && cmd.alias ? `/${cmd.name} (${cmd.alias})` : `/${cmd.name}`
  }

  // Handle keyboard navigation
  useKeyboard((key) => {
    switch (key.name) {
      case 'up':
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1))
        break
      case 'down':
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0))
        break
      case 'tab': {
        // Tab completion - fill in the selected command
        const selectedCommand = filteredCommands[selectedIndex]
        if (selectedCommand) {
          onInputChange(`/${selectedCommand.name}`)
        }
        break
      }
      case 'return': {
        // Execute the selected command
        const selectedCommand = filteredCommands[selectedIndex]
        if (selectedCommand) {
          onExecute(selectedCommand)
        }
        break
      }
      case 'escape':
        onClose()
        break
      default:
        break
    }
  })

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {}
    for (const cmd of filteredCommands) {
      const category = cmd.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category]!.push(cmd)
    }
    return groups
  }, [filteredCommands])

  // Calculate global index for selection highlighting
  const getGlobalIndex = (category: string, localIndex: number): number => {
    let idx = 0
    for (const [cat, cmds] of Object.entries(groupedCommands)) {
      if (cat === category) {
        return idx + localIndex
      }
      idx += cmds.length
    }
    return -1
  }

  if (filteredCommands.length === 0) {
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
          borderColor: themeColors.border,
          padding: 1,
        }}
      >
        <text fg={themeColors.textSubtle}>No matching commands</text>
      </box>
    )
  }

  // Calculate height: header + categories + commands + spacing
  const categoryCount = Object.keys(groupedCommands).length
  const commandCount = filteredCommands.length
  const maxHeight = Math.min(commandCount + categoryCount + 2, 15)

  return (
    <box
      style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        height: maxHeight,
        zIndex: 100,
        backgroundColor: SUBTLE_BG,
        border: true,
        borderColor: BRAND_ORANGE,
        flexDirection: 'column',
        paddingX: 1,
      }}
    >
      {/* Header */}
      <text attributes={TextAttributes.DIM}>
        <span fg={themeColors.textMuted}>Commands</span>
        <span fg={themeColors.textSubtle}> · ↑↓ navigate · Tab complete · Enter select</span>
      </text>

      {/* Scrollable command list */}
      <scrollbox
        flexGrow={1}
        contentOptions={{ flexDirection: 'column' }}
        stickyScroll={false}
      >
        {Object.entries(groupedCommands).map(([category, cmds]) => (
          <box key={category} flexDirection="column">
            {/* Category header */}
            <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </text>

            {/* Commands in this category */}
            {cmds.map((cmd, localIdx) => {
              const globalIdx = getGlobalIndex(category, localIdx)
              const isSelected = globalIdx === selectedIndex

              return (
                <box key={cmd.name} flexDirection="row">
                  <text style={{ width: 20 }}>
                    <span fg={isSelected ? themeColors.primary : themeColors.text}>
                      {isSelected ? '▸ ' : '  '}
                      {getDisplayLabel(cmd)}
                    </span>
                  </text>
                  <text fg={themeColors.textSubtle}>{cmd.description}</text>
                </box>
              )
            })}
          </box>
        ))}
      </scrollbox>
    </box>
  )
}
