import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { COMMANDS } from '../commands'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'

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
  ['Ctrl+C', 'Quit'],
  ['/', 'Open command palette'],
  ['Enter', 'Send message'],
  ['Shift+Enter', 'Newline'],
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
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}> WorkflowFiesta CLI </span>
        <span fg={themeColors.textSubtle}>
          v
          {version}
        </span>
      </text>
      <text fg={themeColors.textSubtle}> Enter or Esc to close</text>
      <text style={{ height: 1 }} />

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
    </box>
  )
}
