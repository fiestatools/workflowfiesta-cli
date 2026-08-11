import type { ScrollBoxRenderable } from '@opentui/core'
import type { Command } from '../commands'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'

import { useEffect, useMemo, useRef, useState } from 'react'
import { filterCommands, findCommand, parseCommandInput } from '../commands'
import { useCommands } from '../hooks'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { commandRow, groupCommands, paletteHeight, scrollTopFor, viewportRows } from './commandPaletteLayout'

/** Props for the CommandPalette component. */
export interface CommandPaletteProps {
  /** Current input value (including the leading /). */
  input: string
  /** Called when a command is selected for execution, with any typed arguments. */
  onExecute: (command: Command, args: string) => void
  /** Called when the palette should close (escape pressed). */
  onClose: () => void
  /** Called when input should be updated (tab completion). */
  onInputChange: (value: string) => void
  /**
   * Called once when the palette opens, so stale custom commands can be
   * refreshed in the background while the cached list is already on screen.
   */
  onOpen?: () => void
}

/** Command palette overlay for / commands. */
export function CommandPalette({ input, onExecute, onClose, onInputChange, onOpen }: CommandPaletteProps) {
  // Split input (minus the leading /) into the command word and its arguments.
  const { word, args } = parseCommandInput(input.startsWith('/') ? input.slice(1) : '')
  const query = word.toLowerCase()
  const allCommands = useCommands()

  const filteredCommands = useMemo(() => {
    // Once arguments are being typed, only an exact argument-taking command
    // still matches (e.g. "/rename My title" pins the palette to /rename).
    if (args) {
      const exact = findCommand(query, allCommands)
      return exact?.requiresArgs ? [exact] : []
    }
    return filterCommands(query, allCommands)
  }, [query, args, allCommands])

  const groups = useMemo(() => groupCommands(filteredCommands), [filteredCommands])
  const commands = useMemo(() => groups.flatMap(group => group.commands), [groups])
  const groupOffsets = useMemo(() => {
    let offset = 0
    return groups.map((group) => {
      const start = offset
      offset += group.commands.length
      return start
    })
  }, [groups])

  useEffect(() => {
    onOpen?.()
  }, [onOpen])

  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (commands.length === 0)
        return 0
      if (prev >= commands.length)
        return commands.length - 1
      return prev < 0 ? 0 : prev
    })
  }, [commands.length])

  const scrollRef = useRef<ScrollBoxRenderable>(null)
  const selectedRow = commandRow(groups, selectedIndex)
  const rows = viewportRows(groups)

  useEffect(() => {
    const scrollBox = scrollRef.current
    if (!scrollBox) {
      return
    }
    scrollBox.scrollTop = scrollTopFor(selectedRow, scrollBox.scrollTop, rows)
  }, [selectedRow, rows])

  // Get display label with alias if it matches
  const getDisplayLabel = (cmd: Command) => {
    const isAliasMatch = cmd.alias?.toLowerCase().startsWith(query)
    return isAliasMatch && cmd.alias ? `/${cmd.name} (${cmd.alias})` : `/${cmd.name}`
  }

  // Handle keyboard navigation
  useKeyboard((key) => {
    switch (key.name) {
      case 'up':
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : commands.length - 1))
        break
      case 'down':
        setSelectedIndex(prev => (prev < commands.length - 1 ? prev + 1 : 0))
        break
      case 'tab': {
        // Tab completion - fill in the selected command. Argument-taking
        // commands get a trailing space so the user can keep typing.
        const selectedCommand = commands[selectedIndex]
        if (selectedCommand) {
          onInputChange(`/${selectedCommand.name}${selectedCommand.requiresArgs ? ' ' : ''}`)
        }
        break
      }
      case 'return': {
        const selectedCommand = commands[selectedIndex]
        if (!selectedCommand) {
          break
        }
        // An argument-taking command with nothing typed yet completes to
        // "/name " so the user can type the arguments, instead of executing.
        if (selectedCommand.requiresArgs && !args) {
          onInputChange(`/${selectedCommand.name} `)
          break
        }
        onExecute(selectedCommand, args)
        break
      }
      case 'escape':
        onClose()
        break
      default:
        break
    }
  })

  if (commands.length === 0) {
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

  return (
    <box
      style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        height: paletteHeight(groups),
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
        ref={scrollRef}
        flexGrow={1}
        contentOptions={{ flexDirection: 'column' }}
        stickyScroll={false}
      >
        {groups.map((group, groupIdx) => (
          <box key={group.category} flexDirection="column">
            {/* Category header */}
            <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>
              {group.category.charAt(0).toUpperCase() + group.category.slice(1)}
            </text>

            {/* Commands in this category */}
            {group.commands.map((cmd, localIdx) => {
              const isSelected = groupOffsets[groupIdx]! + localIdx === selectedIndex

              return (
                <box key={cmd.name} flexDirection="row">
                  <text style={{ width: 20 }}>
                    <span fg={isSelected ? themeColors.primary : themeColors.text}>
                      {isSelected ? '▸ ' : '  '}
                      {getDisplayLabel(cmd)}
                    </span>
                  </text>
                  <text fg={themeColors.textSubtle}>
                    {cmd.requiresArgs && cmd.argsPlaceholder && (
                      <span attributes={TextAttributes.DIM}>
                        {cmd.argsPlaceholder}
                        {' · '}
                      </span>
                    )}
                    {cmd.description}
                  </text>
                </box>
              )
            })}
          </box>
        ))}
      </scrollbox>
    </box>
  )
}
