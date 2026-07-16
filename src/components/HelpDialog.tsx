import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { COMMANDS } from '../commands'
import { themeColors } from '../theme'
import { OverlayContainer } from './OverlayContainer'

/** Props for the help dialog overlay. */
export interface HelpDialogProps {
  version: string
  onClose: () => void
}

/** Keyboard shortcuts shown in the help dialog. */
const SHORTCUTS: [string, string][] = [
  ['Ctrl+B', 'Toggle side panel'],
  ['Ctrl+S', 'Toggle settings'],
  ['Ctrl+N', 'New conversation'],
  ['Ctrl+Y', 'Copy last reply'],
  ['Ctrl+C', 'Quit'],
  ['/', 'Open command palette'],
  ['Enter', 'Send message'],
  ['Shift+Enter', 'Newline'],
  ['↑/↓', 'Input history navigation'],
  ['Esc', 'Cancel / close overlay'],
]

/** Static help overlay: keyboard shortcuts and slash commands. */
export function HelpDialog({ version, onClose }: HelpDialogProps) {
  useKeyboard((key) => {
    if (key.name === 'escape' || key.name === 'return') {
      onClose()
    }
  })

  return (
    <OverlayContainer
      title="WorkflowFiesta CLI"
      subtitle={`v${version}`}
      helpText="Enter or Esc to close"
    >
      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Keyboard shortcuts</text>
      {SHORTCUTS.map(([keys, desc]) => (
        <box key={keys} flexDirection="row" paddingLeft={1}>
          <text style={{ width: 14 }}>
            <span fg={themeColors.info}>{keys}</span>
          </text>
          <text fg={themeColors.text}>{desc}</text>
        </box>
      ))}

      <text style={{ height: 1 }} />
      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Slash commands</text>
      {COMMANDS.map(cmd => (
        <box key={cmd.name} flexDirection="row" paddingLeft={1}>
          <text style={{ width: 14 }}>
            <span fg={themeColors.primary}>
              /
              {cmd.name}
            </span>
            {cmd.alias && (
              <span fg={themeColors.textSubtle}>
                {' '}
                /
                {cmd.alias}
              </span>
            )}
          </text>
          <text fg={themeColors.text}>{cmd.description}</text>
        </box>
      ))}
    </OverlayContainer>
  )
}
