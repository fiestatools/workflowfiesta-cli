import type { ProviderSummary } from '../settings'
import { TextAttributes } from '@opentui/core'
import { useDialogKeyboard } from '../hooks'
import { PROVIDER_TYPE_LABELS } from '../settings'
import { themeColors } from '../theme'
import { OverlayContainer } from './OverlayContainer'
import { SelectableRow } from './SelectableRow'

export interface ProviderPickerProps {
  providers: ProviderSummary[]
  currentProviderId?: string
  onSelect: (providerId: string) => void
  onClose: () => void
  onAddNew?: () => void
  title?: string
}

export function ProviderPicker({
  providers,
  currentProviderId,
  onSelect,
  onClose,
  onAddNew,
  title = 'Select AI Provider',
}: ProviderPickerProps) {
  const hasAddNew = Boolean(onAddNew)
  const rowCount = providers.length + (hasAddNew ? 1 : 0)

  const providerIndex = providers.findIndex(p => p.uid === currentProviderId)
  const initial = providerIndex >= 0 ? providerIndex : 0

  const { selectedIndex } = useDialogKeyboard({
    itemCount: rowCount,
    onClose,
    onSelect: (index) => {
      if (hasAddNew && index === providers.length) {
        onAddNew?.()
        return
      }
      const provider = providers[index]
      if (provider) {
        onSelect(provider.uid)
        onClose()
      }
    },
    initialIndex: initial,
  })

  return (
    <OverlayContainer
      title={title}
      helpText="↑↓ to move · Enter to select · Esc to close"
    >
      {providers.length === 0 && !hasAddNew
        ? (
            <box flexDirection="column" paddingLeft={1}>
              <text fg={themeColors.textMuted}>
                No AI providers configured.
              </text>
              <text fg={themeColors.textSubtle} attributes={TextAttributes.DIM}>
                Add a provider in the web app to get started.
              </text>
            </box>
          )
        : (
            <>
              {providers.map((provider, index) => {
                const isSelected = index === selectedIndex
                const isCurrent = provider.uid === currentProviderId || provider.isDefault
                const typeLabel = PROVIDER_TYPE_LABELS[provider.type] ?? provider.type
                return (
                  <SelectableRow
                    key={provider.uid}
                    isSelected={isSelected}
                    label={provider.name}
                    sublabel={typeLabel}
                    badge={isCurrent ? '(current)' : undefined}
                  />
                )
              })}
              {hasAddNew && (
                <box flexDirection="row" paddingLeft={1} marginTop={providers.length > 0 ? 1 : 0}>
                  <text style={{ width: 2 }}>
                    <span fg={selectedIndex === providers.length ? themeColors.primary : themeColors.text}>
                      {selectedIndex === providers.length ? '▸' : ' '}
                    </span>
                  </text>
                  <text>
                    <span
                      fg={selectedIndex === providers.length ? themeColors.primary : themeColors.info}
                      attributes={selectedIndex === providers.length ? TextAttributes.BOLD : undefined}
                    >
                      + Add new provider
                    </span>
                  </text>
                </box>
              )}
            </>
          )}
    </OverlayContainer>
  )
}
