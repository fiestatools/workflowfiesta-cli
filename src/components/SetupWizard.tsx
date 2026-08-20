import type { AuthService } from '../auth'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getConfigManager } from '../config'
import { BRAND_ORANGE, themeColors } from '../theme'

export interface SetupWizardProps {
  authService: AuthService
  onAuthenticated: () => void
}

type WizardStep = 'import' | 'auth'

const ENV_TRUTHY = new Set(['1', 'true', 'yes'])
const ENV_FALSY = new Set(['0', 'false', 'no'])

function getImportClaudeEnv(): boolean | undefined {
  const val = process.env.WORKFLOWFIESTA_IMPORT_CLAUDE
  if (val === undefined || val === '')
    return undefined
  const lower = val.toLowerCase()
  if (ENV_TRUTHY.has(lower))
    return true
  if (ENV_FALSY.has(lower))
    return false
  return undefined
}

function persistImportChoice(importFromClaude: boolean): void {
  if (!importFromClaude) {
    const configManager = getConfigManager()
    configManager.setConfig({
      skills: { disableExternal: true },
    })
  }
}

function ImportStep({ onChoice }: { onChoice: (importFromClaude: boolean) => void }) {
  useKeyboard(useCallback((key: { name?: string }) => {
    if (key.name === 'y' || key.name === 'Y') {
      onChoice(true)
    }
    else if (key.name === 'n' || key.name === 'N') {
      onChoice(false)
    }
  }, [onChoice]))

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={2}>
        <ascii-font font="block" text="WorkflowFiesta" color={BRAND_ORANGE} />

        <text attributes={TextAttributes.DIM}>
          AI Agents for Your Entire Business
        </text>

        <box
          marginTop={1}
          flexDirection="column"
          alignItems="center"
          gap={1}
          borderStyle="rounded"
          borderColor={BRAND_ORANGE}
          paddingX={3}
          paddingY={1}
          width={64}
        >
          <text attributes={TextAttributes.BOLD}>
            Setup (1/2): Import Settings
          </text>

          <text>
            Would you like to import settings (skills, config) from Claude?
          </text>

          <text attributes={TextAttributes.DIM}>
            This allows reading from ~/.claude/ and project .claude/ directories.
          </text>

          <box marginTop={1} flexDirection="row" gap={3}>
            <text>
              [
              <span fg={themeColors.info}>Y</span>
              ] Yes, import from Claude
            </text>
            <text>
              [
              <span fg={themeColors.info}>N</span>
              ] No, start fresh
            </text>
          </box>
        </box>
      </box>
    </box>
  )
}

function AuthStep({ authService, onAuthenticated }: { authService: AuthService, onAuthenticated: () => void }) {
  const [authError, setAuthError] = useState<string | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current)
      return
    hasStartedRef.current = true

    let cancelled = false
    authService.signInWithBrowser()
      .then((success) => {
        if (cancelled)
          return
        if (success) {
          onAuthenticated()
        }
        else {
          setAuthError('Browser sign-in was not completed.')
        }
      })
      .catch((err) => {
        if (cancelled)
          return
        setAuthError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
    }
  }, [authService, onAuthenticated])

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={2}>
        <ascii-font font="block" text="WorkflowFiesta" color={BRAND_ORANGE} />

        <box
          marginTop={1}
          flexDirection="column"
          alignItems="center"
          gap={1}
          borderStyle="rounded"
          borderColor={BRAND_ORANGE}
          paddingX={3}
          paddingY={1}
          width={64}
        >
          <text attributes={TextAttributes.BOLD}>
            Setup (2/2): Sign In
          </text>

          {!authError && (
            <text>
              Opening browser to sign in to WorkflowFiesta...
            </text>
          )}

          {!authError && (
            <text attributes={TextAttributes.DIM}>
              Waiting for authentication to complete...
            </text>
          )}

          {authError && (
            <box flexDirection="column" gap={1} alignItems="center">
              <text fg={themeColors.error}>
                {authError}
              </text>
              <text attributes={TextAttributes.DIM}>
                Run `wf auth login` manually to sign in.
              </text>
            </box>
          )}
        </box>
      </box>
    </box>
  )
}

export function SetupWizard({ authService, onAuthenticated }: SetupWizardProps) {
  const envChoice = useMemo(getImportClaudeEnv, [])
  const [step, setStep] = useState<WizardStep>(() => envChoice !== undefined ? 'auth' : 'import')

  useEffect(() => {
    if (envChoice !== undefined) {
      persistImportChoice(envChoice)
    }
  }, [envChoice])

  const handleImportChoice = useCallback((importFromClaude: boolean) => {
    persistImportChoice(importFromClaude)
    setStep('auth')
  }, [])

  if (step === 'import') {
    return <ImportStep onChoice={handleImportChoice} />
  }

  return <AuthStep authService={authService} onAuthenticated={onAuthenticated} />
}
