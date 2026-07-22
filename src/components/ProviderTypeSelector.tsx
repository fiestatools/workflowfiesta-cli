import type { ProviderType } from '../settings'
import { TextAttributes } from '@opentui/core'
import { useDialogKeyboard } from '../hooks'
import { PROVIDER_TYPE_LABELS } from '../settings'
import { themeColors } from '../theme'
import { OverlayContainer } from './OverlayContainer'

export const PROVIDER_TYPES: ProviderType[] = ['anthropic', 'openai', 'aws_bedrock', 'ollama']

export interface ProviderTypeSelectorProps {
  onSelect: (type: ProviderType) => void
  onClose: () => void
  title?: string
}

export function ProviderTypeSelector({
  onSelect,
  onClose,
  title = 'Add AI Provider',
}: ProviderTypeSelectorProps) {
  const { selectedIndex } = useDialogKeyboard({
    itemCount: PROVIDER_TYPES.length,
    onClose,
    onSelect: (index) => {
      const type = PROVIDER_TYPES[index]
      if (type) {
        onSelect(type)
      }
    },
  })

  return (
    <OverlayContainer
      title={title}
      subtitle="Select a provider type"
      helpText="↑↓ to move · Enter to select · Esc to cancel"
    >
      {PROVIDER_TYPES.map((type, index) => {
        const isSelected = index === selectedIndex
        return (
          <box key={type} flexDirection="row" paddingLeft={1}>
            <text style={{ width: 2 }}>
              <span fg={isSelected ? themeColors.primary : themeColors.text}>
                {isSelected ? '▸' : ' '}
              </span>
            </text>
            <text>
              <span
                fg={isSelected ? themeColors.primary : themeColors.text}
                attributes={isSelected ? TextAttributes.BOLD : undefined}
              >
                {PROVIDER_TYPE_LABELS[type]}
              </span>
            </text>
          </box>
        )
      })}
    </OverlayContainer>
  )
}
