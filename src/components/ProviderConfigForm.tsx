import type { CreateProviderConfig, ProviderSummary, ProviderType } from '../settings'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useMemo, useState } from 'react'
import { PROVIDER_TYPE_LABELS } from '../settings'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { MaskedInput } from './MaskedInput'

export interface ProviderFieldDef {
  key: string
  label: string
  type: 'text' | 'password'
  placeholder: string
  required: boolean
}

export interface ProviderConfigFormProps {
  providerType: ProviderType
  onSubmit: (config: CreateProviderConfig) => Promise<ProviderSummary>
  onBack: () => void
  onCancel: () => void
}

type Action = 'submit' | 'back' | 'cancel'

export const PROVIDER_FIELDS: Record<ProviderType, ProviderFieldDef[]> = {
  anthropic: [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'My Anthropic', required: true },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true },
  ],
  openai: [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'My OpenAI', required: true },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
    { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://api.openai.com (optional)', required: false },
  ],
  aws_bedrock: [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'My Bedrock', required: true },
    { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1', required: true },
    { key: 'accessKeyId', label: 'Access Key ID', type: 'text', placeholder: 'AKIA...', required: true },
    { key: 'secretAccessKey', label: 'Secret Key', type: 'password', placeholder: 'secret...', required: true },
  ],
  ollama: [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Local Ollama', required: true },
    { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'http://localhost:11434', required: true },
  ],
}

function buildConfig(providerType: ProviderType, values: Record<string, string>): CreateProviderConfig | null {
  const name = values.name?.trim()
  if (!name)
    return null

  switch (providerType) {
    case 'anthropic': {
      const apiKey = values.apiKey?.trim()
      if (!apiKey)
        return null
      return { type: 'anthropic', name, apiKey }
    }
    case 'openai': {
      const apiKey = values.apiKey?.trim()
      if (!apiKey)
        return null
      const baseUrl = values.baseUrl?.trim() || undefined
      return { type: 'openai', name, apiKey, baseUrl }
    }
    case 'aws_bedrock': {
      const region = values.region?.trim()
      const accessKeyId = values.accessKeyId?.trim()
      const secretAccessKey = values.secretAccessKey?.trim()
      if (!region || !accessKeyId || !secretAccessKey)
        return null
      return { type: 'aws_bedrock', name, region, accessKeyId, secretAccessKey }
    }
    case 'ollama': {
      const baseUrl = values.baseUrl?.trim()
      if (!baseUrl)
        return null
      return { type: 'ollama', name, baseUrl }
    }
  }
}

export function ProviderConfigForm({
  providerType,
  onSubmit,
  onBack,
  onCancel,
}: ProviderConfigFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle')
  const [error, setError] = useState<string | undefined>()

  const fields = useMemo(() => PROVIDER_FIELDS[providerType], [providerType])
  const actions: Action[] = ['submit', 'back', 'cancel']
  const rowCount = fields.length + actions.length

  const typeLabel = PROVIDER_TYPE_LABELS[providerType]

  const setValue = (key: string, value: string): void =>
    setValues(prev => ({ ...prev, [key]: value }))

  const getMissingRequired = useCallback((): string[] => {
    return fields
      .filter(f => f.required && !values[f.key]?.trim())
      .map(f => f.label)
  }, [fields, values])

  const handleSubmit = async (): Promise<void> => {
    const missing = getMissingRequired()
    if (missing.length > 0) {
      setError(`Required: ${missing.join(', ')}`)
      return
    }

    const config = buildConfig(providerType, values)
    if (!config) {
      setError('Invalid configuration')
      return
    }

    setStatus('submitting')
    setError(undefined)
    try {
      await onSubmit(config)
    }
    catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Failed to create provider')
    }
  }

  const runAction = (action: Action): void => {
    if (status !== 'idle')
      return
    if (action === 'submit')
      void handleSubmit()
    else if (action === 'back')
      onBack()
    else
      onCancel()
  }

  useKeyboard((key) => {
    if (status !== 'idle') {
      if (key.name === 'escape')
        onCancel()
      return
    }

    if (key.name === 'escape') {
      onBack()
    }
    else if (key.name === 'tab') {
      setFocusedIndex(prev => (prev + (key.shift ? -1 : 1) + rowCount) % rowCount)
    }
    else if (key.name === 'down') {
      setFocusedIndex(prev => (prev < rowCount - 1 ? prev + 1 : 0))
    }
    else if (key.name === 'up') {
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : rowCount - 1))
    }
    else if (key.name === 'return') {
      if (focusedIndex < fields.length) {
        // Advance through fields
        setFocusedIndex(prev => (prev < rowCount - 1 ? prev + 1 : prev))
      }
      else {
        runAction(actions[focusedIndex - fields.length]!)
      }
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
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}>
          {' '}
          Add
          {' '}
          {typeLabel}
          {' '}
          Provider
        </span>
      </text>
      <text fg={themeColors.textSubtle}>
        {' '}
        Type to fill, Tab/↓/Enter next field, Esc go back
      </text>
      <text style={{ height: 1 }} />

      {fields.map((field, index) => {
        const isFocused = focusedIndex === index
        return (
          <box key={field.key} flexDirection="row" paddingLeft={1}>
            <text style={{ width: 2 }}>
              <span fg={isFocused ? themeColors.primary : themeColors.text}>
                {isFocused ? '▸' : ' '}
              </span>
            </text>
            <text style={{ width: 18 }}>
              <span fg={isFocused ? themeColors.primary : themeColors.text}>
                {field.label}
                {field.required ? ' *' : ''}
                :
              </span>
            </text>
            {field.type === 'password'
              ? (
                  <MaskedInput
                    value={values[field.key] ?? ''}
                    onChange={v => setValue(field.key, v)}
                    placeholder={field.placeholder}
                    focused={isFocused}
                  />
                )
              : (
                  <input
                    value={values[field.key] ?? ''}
                    onChange={(v: string) => setValue(field.key, v)}
                    placeholder={field.placeholder}
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

      {/* Action row */}
      <box flexDirection="row" paddingLeft={1} gap={2}>
        {actions.map((action, i) => {
          const rowIndex = fields.length + i
          const isFocused = focusedIndex === rowIndex
          const label = action === 'submit' ? 'Create' : action === 'back' ? 'Back' : 'Cancel'
          const color = action === 'cancel'
            ? themeColors.error
            : action === 'back'
              ? themeColors.textMuted
              : themeColors.primary
          return (
            <text key={action}>
              <span
                fg={isFocused ? color : themeColors.textMuted}
                attributes={isFocused ? TextAttributes.BOLD : undefined}
              >
                {isFocused ? '▸ ' : '  '}
                {label}
              </span>
            </text>
          )
        })}
      </box>

      {status === 'submitting' && (
        <text fg={themeColors.info} paddingLeft={1}>Creating provider...</text>
      )}
      {error && (
        <text fg={themeColors.error} paddingLeft={1}>{error}</text>
      )}
    </box>
  )
}
