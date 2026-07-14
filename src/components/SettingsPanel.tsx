import type { AuthService } from '../auth'
import type { CliConfig } from '../config'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useState } from 'react'
import { getConfigManager } from '../config'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { openUrl } from '../utils/openUrl'

/** Documentation URL */
const DOCS_URL = 'https://testfiesta.gitbook.io/workflowfiesta'

/** Default values for settings. */
const DEFAULTS = {
  apiBaseUrl: 'https://api.workflowfiesta.com',
  requestTimeoutMs: 30000,
  agentId: '(uses org default)',
}

/** Props for the SettingsPanel component. */
export interface SettingsPanelProps {
  authService: AuthService
  onClose: () => void
}

/** Available setting fields. */
type SettingField = 'apiBaseUrl' | 'agentId' | 'requestTimeoutMs'

interface SettingFieldConfig {
  key: SettingField
  label: string
  defaultValue: string
}

const SETTING_FIELDS: SettingFieldConfig[] = [
  { key: 'apiBaseUrl', label: 'API Base URL', defaultValue: DEFAULTS.apiBaseUrl },
  { key: 'agentId', label: 'Agent ID', defaultValue: DEFAULTS.agentId },
  { key: 'requestTimeoutMs', label: 'Timeout (ms)', defaultValue: String(DEFAULTS.requestTimeoutMs) },
]

/** Settings panel component - renders as an overlay dialog. */
export function SettingsPanel({ authService, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<CliConfig>({})
  const [apiUrlOverride, setApiUrlOverride] = useState<string | undefined>()
  const [editingField, setEditingField] = useState<SettingField | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accountFingerprint, setAccountFingerprint] = useState<string | undefined>()
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Total selectable items: settings + docs + sign out (if authenticated)
  const totalItems = SETTING_FIELDS.length + 1 + (isAuthenticated ? 1 : 0)
  const docsIndex = SETTING_FIELDS.length
  const signOutIndex = SETTING_FIELDS.length + 1

  /** Get the display value for a setting field. */
  const getDisplayValue = (field: SettingFieldConfig): { value: string, isDefault: boolean, source?: string } => {
    const storedValue = config[field.key]

    // Special handling for apiBaseUrl - check credential override first
    if (field.key === 'apiBaseUrl' && apiUrlOverride) {
      return { value: apiUrlOverride, isDefault: false, source: 'session' }
    }

    if (storedValue === undefined || storedValue === '' || storedValue === null) {
      return { value: field.defaultValue, isDefault: true }
    }

    return { value: String(storedValue), isDefault: false }
  }

  // Load config and auth state on mount
  useEffect(() => {
    const configManager = getConfigManager()
    // Clear cache to ensure fresh read from disk
    configManager.clearCache()
    setConfig(configManager.getConfig())

    void authService.isAuthenticated().then(setIsAuthenticated)
    void authService.getAccountFingerprint().then(setAccountFingerprint)
    void authService.getApiUrlOverride().then(setApiUrlOverride)
  }, [authService])

  // Clear message after 2 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(setMessage, 2000, null)
      return () => clearTimeout(timer)
    }
  }, [message])

  const handleSave = useCallback(async () => {
    if (!editingField)
      return

    const configManager = getConfigManager()
    let valueToSave: string | number | undefined = editValue.trim() || undefined

    // Convert to number for timeout
    if (editingField === 'requestTimeoutMs' && valueToSave) {
      const num = Number.parseInt(valueToSave as string, 10)
      if (Number.isNaN(num) || num <= 0) {
        setMessage({ type: 'error', text: 'Invalid timeout value' })
        return
      }
      valueToSave = num
    }

    // Special handling for API Base URL - update credential store's apiUrlOverride
    if (editingField === 'apiBaseUrl') {
      if (valueToSave && typeof valueToSave === 'string') {
        await authService.setApiUrlOverride(valueToSave)
        setApiUrlOverride(valueToSave)
      }
      else {
        await authService.clearApiUrlOverride()
        setApiUrlOverride(undefined)
      }
      setEditingField(null)
      setEditValue('')
      setMessage({ type: 'success', text: 'API URL saved!' })
      return
    }

    configManager.setConfig({ [editingField]: valueToSave })
    setConfig(configManager.getConfig())
    setEditingField(null)
    setEditValue('')
    setMessage({ type: 'success', text: 'Setting saved!' })
  }, [editingField, editValue, authService])

  const handleSignOut = useCallback(async () => {
    await authService.signOut()
    setIsAuthenticated(false)
    setAccountFingerprint(undefined)
    setMessage({ type: 'success', text: 'Signed out successfully' })
  }, [authService])

  const handleOpenDocs = useCallback(async () => {
    const opened = await openUrl(DOCS_URL)
    if (opened) {
      setMessage({ type: 'success', text: 'Opening docs in browser...' })
    }
    else {
      setMessage({ type: 'error', text: `Open manually: ${DOCS_URL}` })
    }
  }, [])

  // Keyboard navigation
  useKeyboard((key) => {
    // Close on Escape
    if (key.name === 'escape') {
      if (editingField) {
        setEditingField(null)
        setEditValue('')
      }
      else {
        onClose()
      }
      return
    }

    // Quick shortcut: ? to open docs
    if (key.sequence === '?' && !editingField) {
      void handleOpenDocs()
      return
    }

    // If editing a field, handle input
    if (editingField) {
      if (key.name === 'return') {
        handleSave()
      }
      return
    }

    // Navigation
    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : totalItems - 1))
    }
    else if (key.name === 'down' || key.name === 'j') {
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : 0))
    }
    else if (key.name === 'return' || key.name === 'e') {
      if (selectedIndex < SETTING_FIELDS.length) {
        const field = SETTING_FIELDS[selectedIndex]!
        setEditingField(field.key)
        setEditValue(String(config[field.key] ?? ''))
      }
      else if (selectedIndex === docsIndex) {
        void handleOpenDocs()
      }
      else if (selectedIndex === signOutIndex && isAuthenticated) {
        void handleSignOut()
      }
    }
  })

  const hint = editingField
    ? 'Enter to save, Esc to cancel'
    : '↑↓ navigate, Enter to edit, ? open docs, Esc to close'

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
      {/* Header */}
      <text>
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}> Settings</span>
      </text>
      <text fg={themeColors.textSubtle}>
        {' '}
        {hint}
      </text>
      <text style={{ height: 1 }} />

      {/* Auth Status */}
      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Authentication</text>
      <box flexDirection="row" paddingLeft={1}>
        <text>
          <span fg={themeColors.textMuted}>Status: </span>
          <span fg={isAuthenticated ? themeColors.success : themeColors.error}>
            {isAuthenticated ? 'Signed in' : 'Not signed in'}
          </span>
          {accountFingerprint && (
            <span fg={themeColors.textSubtle}>
              {' '}
              (
              {accountFingerprint}
              )
            </span>
          )}
        </text>
      </box>
      <text style={{ height: 1 }} />

      {/* Settings List */}
      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Configuration</text>
      {SETTING_FIELDS.map((field, index) => {
        const isSelected = selectedIndex === index && !editingField
        const isEditing = editingField === field.key
        const { value: displayValue, isDefault, source } = getDisplayValue(field)

        return (
          <box key={field.key} flexDirection="row" paddingLeft={1}>
            <text style={{ width: 2 }}>
              <span fg={isSelected ? themeColors.primary : themeColors.text}>
                {isSelected ? '▸' : ' '}
              </span>
            </text>
            <text style={{ width: 18 }}>
              <span fg={isSelected ? themeColors.primary : themeColors.text}>
                {field.label}
                :
              </span>
            </text>
            {isEditing
              ? (
                  <input
                    value={editValue}
                    onInput={setEditValue}
                    onSubmit={handleSave}
                    placeholder={field.defaultValue}
                    placeholderColor={themeColors.textSubtle}
                    textColor={themeColors.text}
                    focused={true}
                    style={{ flexGrow: 1 }}
                  />
                )
              : (
                  <text>
                    <span fg={themeColors.text}>{displayValue}</span>
                    {isDefault && <span fg={themeColors.textSubtle}> (default)</span>}
                    {source === 'session' && <span fg={themeColors.info}> (session)</span>}
                  </text>
                )}
          </box>
        )
      })}

      {/* Documentation link */}
      <box flexDirection="row" paddingLeft={1} marginTop={1}>
        <text style={{ width: 2 }}>
          <span fg={selectedIndex === docsIndex ? themeColors.primary : themeColors.text}>
            {selectedIndex === docsIndex && !editingField ? '▸' : ' '}
          </span>
        </text>
        <text>
          <span fg={selectedIndex === docsIndex ? themeColors.primary : themeColors.info}>Documentation</span>
          <span fg={themeColors.textSubtle}> (?) - Open in browser</span>
        </text>
      </box>

      {/* Sign Out option */}
      {isAuthenticated && (
        <box flexDirection="row" paddingLeft={1} marginTop={1}>
          <text style={{ width: 2 }}>
            <span fg={selectedIndex === signOutIndex ? themeColors.primary : themeColors.text}>
              {selectedIndex === signOutIndex && !editingField ? '▸' : ' '}
            </span>
          </text>
          <text fg={themeColors.error}>Sign Out</text>
        </box>
      )}

      {/* Message */}
      {message && (
        <box marginTop={1} paddingLeft={1}>
          <text fg={message.type === 'success' ? themeColors.success : themeColors.error}>
            {message.text}
          </text>
        </box>
      )}
    </box>
  )
}
