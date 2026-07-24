import type { StoredAccount } from '../auth'
import { useDialogKeyboard } from '../hooks'
import { themeColors } from '../theme'
import { OverlayContainer } from './OverlayContainer'
import { SelectableRow } from './SelectableRow'

export interface AccountPickerProps {
  accounts: StoredAccount[]
  activeAccountName?: string
  onSelect: (accountName: string) => void
  onClose: () => void
}

export function AccountPicker({
  accounts,
  activeAccountName,
  onSelect,
  onClose,
}: AccountPickerProps) {
  const accountIndex = accounts.findIndex(a => a.name === activeAccountName)
  const initial = accountIndex >= 0 ? accountIndex : 0

  const { selectedIndex } = useDialogKeyboard({
    itemCount: accounts.length,
    onClose,
    onSelect: (index) => {
      const account = accounts[index]
      if (account) {
        onSelect(account.name)
        onClose()
      }
    },
    initialIndex: initial,
  })

  return (
    <OverlayContainer
      title="Switch account"
      helpText="↑↓ to move · Enter to select · Esc to close"
    >
      {accounts.length === 0
        ? (
            <text fg={themeColors.textMuted} paddingLeft={1}>
              No accounts configured. Run: wf auth login --token &lt;token&gt; --name &lt;name&gt;
            </text>
          )
        : (
            accounts.map((account, index) => {
              const isSelected = index === selectedIndex
              const isCurrent = account.name === activeAccountName
              const sublabel = account.apiUrlOverride ?? undefined
              return (
                <SelectableRow
                  key={account.name}
                  isSelected={isSelected}
                  label={account.name}
                  sublabel={sublabel}
                  badge={isCurrent ? '(active)' : undefined}
                />
              )
            })
          )}
    </OverlayContainer>
  )
}
