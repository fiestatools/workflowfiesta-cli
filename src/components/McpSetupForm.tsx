import type { ReactNode } from 'react'
import type { McpSetupResult } from '../chat'
import type { McpSetupEvent } from '../runs/runEvents'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useState } from 'react'
import { logger } from '../logger'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { MaskedInput } from './MaskedInput'

/** Props for the MCP setup form. */
export interface McpSetupFormProps {
  event: McpSetupEvent
  onSubmit: (fields: Record<string, string>) => Promise<McpSetupResult>
  onAuthorize: (credentialId: string) => Promise<boolean>
  onDismiss: () => void
  onCancel: () => void
}

interface FieldDef {
  key: string
  label: string
  optional?: boolean
  /** Render as a masked secret input. */
  secret?: boolean
  placeholder?: string
}

type Action = 'submit' | 'cancel'
type Status = 'idle' | 'submitting'
type Phase = 'form' | 'authorize'

/**
 * Interactive form for a parked run's `setup_mcp_server` tool. Collects the
 * server URL/name (plus optional OAuth client credentials) and, when the server
 * still needs a browser OAuth step, switches to an authorize phase with a
 * Connect button. Mirrors the extension's MCP card.
 */
export function McpSetupForm({ event, onSubmit, onAuthorize, onDismiss, onCancel }: McpSetupFormProps) {
  const fields: FieldDef[] = [
    { key: 'server_url', label: 'Server URL', placeholder: 'https://mcp.example.com/sse' },
    { key: 'server_name', label: 'Server Name', optional: true, placeholder: 'My MCP Server' },
    { key: 'client_id', label: 'Client ID', optional: true, placeholder: '(optional)' },
    { key: 'client_secret', label: 'Client Secret', optional: true, secret: true, placeholder: '(optional)' },
  ]
  const actions: Action[] = ['submit', 'cancel']
  const rowCount = fields.length + actions.length

  const [values, setValues] = useState<Record<string, string>>({
    server_url: event.serverUrl ?? '',
    server_name: event.serverName ?? '',
  })
  // The focused row: 0..fields.length-1 are fields, then the action buttons.
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | undefined>()
  const [phase, setPhase] = useState<Phase>('form')
  const [credentialId, setCredentialId] = useState<string | undefined>()
  const [authNote, setAuthNote] = useState<string | undefined>()

  const setValue = (key: string, value: string): void =>
    setValues(prev => ({ ...prev, [key]: value }))

  const move = (delta: number): void =>
    setFocusedIndex(prev => (prev + delta + rowCount) % rowCount)

  const runSubmit = async (): Promise<void> => {
    if (!values.server_url?.trim()) {
      setError('Server URL is required')
      return
    }
    setStatus('submitting')
    setError(undefined)
    try {
      const result = await onSubmit({
        server_url: values.server_url.trim(),
        server_name: values.server_name?.trim() || 'MCP Server',
        ...(values.client_id?.trim() ? { client_id: values.client_id.trim() } : {}),
        ...(values.client_secret?.trim() ? { client_secret: values.client_secret.trim() } : {}),
      })
      if (result.needsOAuthAuthorize) {
        setStatus('idle')
        setCredentialId(result.credentialId)
        setFocusedIndex(0)
        setPhase('authorize')
      }
      // Otherwise the service dequeues the request and this overlay unmounts.
    }
    catch (err) {
      logger.error(`[mcp] setup failed: ${err instanceof Error ? err.message : String(err)}`)
      setStatus('idle')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const runConnect = async (): Promise<void> => {
    if (!credentialId)
      return
    const opened = await onAuthorize(credentialId)
    setAuthNote(
      opened
        ? 'Opened your browser. Finish authorizing, then choose Done.'
        : 'Could not open a browser automatically — see the log for the URL.',
    )
  }

  // --- Authorize phase --------------------------------------------------------
  useKeyboard((key) => {
    if (phase !== 'authorize')
      return
    if (key.name === 'escape') {
      onCancel()
      return
    }
    const authActions: ('connect' | 'done')[] = ['connect', 'done']
    if (key.name === 'up' || key.name === 'down' || key.name === 'tab') {
      setFocusedIndex(prev => (prev === 0 ? 1 : 0))
    }
    else if (key.name === 'return') {
      if (authActions[focusedIndex] === 'connect')
        void runConnect()
      else onDismiss()
    }
  })

  // --- Form phase -------------------------------------------------------------
  useKeyboard((key) => {
    if (phase !== 'form')
      return
    if (status !== 'idle') {
      if (key.name === 'escape')
        onCancel()
      return
    }

    if (key.name === 'escape') {
      onCancel()
    }
    else if (key.name === 'tab') {
      move(key.shift ? -1 : 1)
    }
    else if (key.name === 'down') {
      move(1)
    }
    else if (key.name === 'up') {
      move(-1)
    }
    else if (key.name === 'return') {
      if (focusedIndex < fields.length) {
        move(1)
      }
      else if (actions[focusedIndex - fields.length] === 'submit') {
        void runSubmit()
      }
      else {
        onCancel()
      }
    }
  })

  if (phase === 'authorize') {
    return (
      <Panel title={`${event.label || 'Connect an MCP server'}`}>
        <text fg={themeColors.textMuted} paddingLeft={1}>
          This server needs a one-time browser authorization to finish connecting.
        </text>
        <text style={{ height: 1 }} />
        <box flexDirection="row" paddingLeft={1} gap={2}>
          <text>
            <span fg={focusedIndex === 0 ? themeColors.primary : themeColors.textMuted} attributes={focusedIndex === 0 ? TextAttributes.BOLD : undefined}>
              {focusedIndex === 0 ? '▸ ' : '  '}
              Connect (open browser)
            </span>
          </text>
          <text>
            <span fg={focusedIndex === 1 ? themeColors.primary : themeColors.textMuted} attributes={focusedIndex === 1 ? TextAttributes.BOLD : undefined}>
              {focusedIndex === 1 ? '▸ ' : '  '}
              Done
            </span>
          </text>
        </box>
        {authNote && <text fg={themeColors.info} paddingLeft={1}>{authNote}</text>}
        <text fg={themeColors.textSubtle} paddingLeft={1}>↑↓/Tab to move · Enter to confirm · Esc to dismiss</text>
      </Panel>
    )
  }

  return (
    <Panel title={`${event.label || 'Connect an MCP server'}`}>
      <text fg={themeColors.textSubtle} paddingLeft={1}>Type to fill · Tab/↓/Enter next field · Esc dismiss</text>
      <text style={{ height: 1 }} />

      {fields.map((field, index) => {
        const isFocused = focusedIndex === index
        return (
          <box key={field.key} flexDirection="row" paddingLeft={1}>
            <text style={{ width: 2 }}>
              <span fg={isFocused ? themeColors.primary : themeColors.text}>{isFocused ? '▸' : ' '}</span>
            </text>
            <text style={{ width: 16 }}>
              <span fg={isFocused ? themeColors.primary : themeColors.text}>
                {field.label}
                {field.optional ? '' : ' *'}
                :
              </span>
            </text>
            {field.secret
              ? (
                  <MaskedInput
                    value={values[field.key] ?? ''}
                    onChange={v => setValue(field.key, v)}
                    placeholder={field.placeholder ?? ''}
                    focused={isFocused}
                  />
                )
              : (
                  <input
                    value={values[field.key] ?? ''}
                    onChange={(v: string) => setValue(field.key, v)}
                    placeholder={field.placeholder ?? ''}
                    placeholderColor={themeColors.textSubtle}
                    textColor={themeColors.text}
                    focused={isFocused}
                    style={{ flexGrow: 1 }}
                  />
                )}
          </box>
        )
      })}

      <text style={{ height: 1 }} />
      <box flexDirection="row" paddingLeft={1} gap={2}>
        {actions.map((action, i) => {
          const rowIndex = fields.length + i
          const isFocused = focusedIndex === rowIndex
          const label = action === 'submit' ? 'Connect' : 'Cancel'
          const color = action === 'cancel' ? themeColors.error : themeColors.primary
          return (
            <text key={action}>
              <span fg={isFocused ? color : themeColors.textMuted} attributes={isFocused ? TextAttributes.BOLD : undefined}>
                {isFocused ? '▸ ' : '  '}
                {label}
              </span>
            </text>
          )
        })}
      </box>

      {status === 'submitting' && <text fg={themeColors.info} paddingLeft={1}>Connecting…</text>}
      {error && <text fg={themeColors.error} paddingLeft={1}>{error}</text>}
    </Panel>
  )
}

/** Shared overlay chrome for the MCP form's two phases. */
function Panel({ title, children }: { title: string, children: ReactNode }) {
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
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}>
          {' '}
          {title}
        </span>
      </text>
      {children}
    </box>
  )
}
