import type { AuthService } from '../auth'
import type { CliConfig } from '../config'
import type { AgentSummary } from '../runs'
import type { Identity, SettingsService } from '../settings'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useState } from 'react'
import { getConfigManager } from '../config'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { openUrl } from '../utils/openUrl'
import { AgentPicker } from './AgentPicker'

/** Documentation URL */
const DOCS_URL = 'https://testfiesta.gitbook.io/workflowfiesta'

/** Default values for settings. */
const DEFAULTS = {
  apiBaseUrl: 'https://api.workflowfiesta.com',
  requestTimeoutMs: 30000,
}

/** Props for the SettingsPanel component. */
export interface SettingsPanelProps {
  authService: AuthService
  settingsService: SettingsService
  /** The org's agents, for the default-agent picker. */
  agents: AgentSummary[]
  /** Called after the local default-agent pin changes, so the run service can re-resolve it. */
  onDefaultAgentChanged?: () => void
  onClose: () => void
}

/** Editable free-text setting fields. */
type SettingField = 'apiBaseUrl' | 'requestTimeoutMs'

interface SettingFieldConfig {
  key: SettingField
  label: string
  defaultValue: string
}

const SETTING_FIELDS: SettingFieldConfig[] = [
  { key: 'apiBaseUrl', label: 'API Base URL', defaultValue: DEFAULTS.apiBaseUrl },
  { key: 'requestTimeoutMs', label: 'Timeout (ms)', defaultValue: String(DEFAULTS.requestTimeoutMs) },
]

/** Format an ISO expiry timestamp as a short date, or a fallback label. */
function formatExpiry(iso: string): string {
  if (!iso)
    return 'unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()))
    return 'unknown'
  const expired = date.getTime() < Date.now()
  const label = date.toISOString().slice(0, 10)
  return expired ? `${label} (expired)` : label
}

/** Settings panel component - renders as an overlay dialog. */
export function SettingsPanel({ authService, settingsService, agents, onDefaultAgentChanged, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<CliConfig>({})
  const [apiUrlOverride, setApiUrlOverride] = useState<string | undefined>()
  const [editingField, setEditingField] = useState<SettingField | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accountFingerprint, setAccountFingerprint] = useState<string | undefined>()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Row layout: editable fields, then the default-agent row, docs, and (when
  // signed in) sign out.
  const agentRowIndex = SETTING_FIELDS.length
  const docsIndex = agentRowIndex + 1
  const signOutIndex = docsIndex + 1
  const totalItems = signOutIndex + (isAuthenticated ? 1 : 0)

  /** The locally pinned default agent, if any. */
  const pinnedAgentId = config.agentId?.trim() || undefined
  const pinnedAgent = agents.find(a => a.uid === pinnedAgentId)
  const accountDefaultAgent = identity?.defaultAgentId
    ? agents.find(a => a.uid === identity.defaultAgentId)
    : undefined
  const agentRowValue = pinnedAgent
    ? pinnedAgent.name
    : accountDefaultAgent
      ? `Account default (${accountDefaultAgent.name})`
      : 'Account default'

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
    void settingsService.getIdentity().then(setIdentity).catch(() => setIdentity(null))
  }, [authService, settingsService])

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

    // Only requestTimeoutMs remains after the apiBaseUrl branch returns.
    configManager.setConfig({ requestTimeoutMs: typeof valueToSave === 'number' ? valueToSave : undefined })
    setConfig(configManager.getConfig())
    setEditingField(null)
    setEditValue('')
    setMessage({ type: 'success', text: 'Setting saved!' })
  }, [editingField, editValue, authService])

  /** Pin a specific agent as this CLI's default. */
  const handlePinAgent = useCallback((agentId: string) => {
    const configManager = getConfigManager()
    configManager.setConfig({ agentId })
    setConfig(configManager.getConfig())
    setAgentPickerOpen(false)
    onDefaultAgentChanged?.()
    const name = agents.find(a => a.uid === agentId)?.name ?? 'agent'
    setMessage({ type: 'success', text: `Default agent set to ${name}` })
  }, [agents, onDefaultAgentChanged])

  /** Clear the local pin so the CLI follows the account default. */
  const handleUseAccountDefault = useCallback(() => {
    const configManager = getConfigManager()
    configManager.setConfig({ agentId: undefined })
    setConfig(configManager.getConfig())
    setAgentPickerOpen(false)
    onDefaultAgentChanged?.()
    setMessage({ type: 'success', text: 'Using account default agent' })
  }, [onDefaultAgentChanged])

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

  // Keyboard navigation. Suppressed while the nested agent picker owns the
  // keyboard (it has its own handler).
  useKeyboard((key) => {
    if (agentPickerOpen)
      return

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
      else if (selectedIndex === agentRowIndex) {
        setAgentPickerOpen(true)
      }
      else if (selectedIndex === docsIndex) {
        void handleOpenDocs()
      }
      else if (selectedIndex === signOutIndex && isAuthenticated) {
        void handleSignOut()
      }
    }
  })

  if (agentPickerOpen) {
    return (
      <AgentPicker
        title="Default agent"
        agents={agents}
        currentAgentId={pinnedAgentId}
        onSelect={handlePinAgent}
        onUseDefault={handleUseAccountDefault}
        defaultAgentName={accountDefaultAgent?.name}
        onClose={() => setAgentPickerOpen(false)}
      />
    )
  }

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

      {/* Account */}
      <text fg={themeColors.textMuted} attributes={TextAttributes.DIM}> Account</text>
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
      {identity && (
        <>
          {identity.userEmail && (
            <box flexDirection="row" paddingLeft={1}>
              <text>
                <span fg={themeColors.textMuted}>User: </span>
                <span fg={themeColors.text}>{identity.userEmail}</span>
                {identity.userName && (
                  <span fg={themeColors.textSubtle}>
                    {' '}
                    (
                    {identity.userName}
                    )
                  </span>
                )}
              </text>
            </box>
          )}
          <box flexDirection="row" paddingLeft={1}>
            <text>
              <span fg={themeColors.textMuted}>Org: </span>
              <span fg={themeColors.text}>{identity.orgName ?? identity.orgId}</span>
              {/* Fall back to the raw org id on older servers that don't send a name. */}
              {identity.orgName && (
                <span fg={themeColors.textSubtle}>
                  {' '}
                  (
                  {identity.orgId}
                  )
                </span>
              )}
            </text>
          </box>
          <box flexDirection="row" paddingLeft={1}>
            <text>
              <span fg={themeColors.textMuted}>Token: </span>
              <span fg={themeColors.text}>{identity.tokenName || 'unnamed'}</span>
              <span fg={themeColors.textSubtle}>
                {' — expires '}
                {formatExpiry(identity.tokenExpiresAt)}
              </span>
            </text>
          </box>
        </>
      )}
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

      {/* Default agent (opens a picker) */}
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 2 }}>
          <span fg={selectedIndex === agentRowIndex ? themeColors.primary : themeColors.text}>
            {selectedIndex === agentRowIndex && !editingField ? '▸' : ' '}
          </span>
        </text>
        <text style={{ width: 18 }}>
          <span fg={selectedIndex === agentRowIndex ? themeColors.primary : themeColors.text}>Default agent:</span>
        </text>
        <text>
          <span fg={themeColors.text}>{agentRowValue}</span>
          {!pinnedAgent && <span fg={themeColors.textSubtle}> (account)</span>}
        </text>
      </box>

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
