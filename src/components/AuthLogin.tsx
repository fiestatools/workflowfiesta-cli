import { TextAttributes } from '@opentui/core';
import { useKeyboard } from '@opentui/react';
import type { InputProps } from '@opentui/react';
import { useState, useCallback } from 'react';
import { BRAND_ORANGE, themeColors } from '../theme';
import type { AuthService } from '../auth';
import { PasswordInput } from './PasswordInput';

export interface AuthLoginProps {
  authService: AuthService;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AuthLoginDialog({ authService, onSuccess, onCancel }: AuthLoginProps) {
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeField, setActiveField] = useState<'token' | 'apiUrl'>('token');

  useKeyboard((key) => {
    if (key.name === 'escape' && !isSubmitting) {
      onCancel();
    }
    if (key.name === 'tab') {
      setActiveField(prev => prev === 'token' ? 'apiUrl' : 'token');
    }
  });

  const handleSubmit = useCallback((value: string) => {
    // Use the value passed directly from the input's onSubmit
    // For token field, use the passed value; for apiUrl field, use current state
    const tokenValue = activeField === 'token' ? value : token;
    
    if (!tokenValue.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    authService.signIn(tokenValue.trim(), apiUrl.trim() || undefined)
      .then(() => {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to sign in');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [activeField, token, apiUrl, isSubmitting, authService, onSuccess]);

  if (success) {
    return (
      <box alignItems="center" justifyContent="center" flexGrow={1}>
        <box flexDirection="column" alignItems="center" gap={1}>
          <text>
            <span fg={themeColors.success}>✓</span> Successfully signed in!
          </text>
          <text attributes={TextAttributes.DIM}>Starting chat...</text>
        </box>
      </box>
    );
  }

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box
        flexDirection="column"
        gap={1}
        paddingX={2}
        paddingY={1}
        borderStyle="rounded"
        borderColor={BRAND_ORANGE}
        width={60}
      >
        <text attributes={TextAttributes.BOLD}>
          Sign In to WorkflowFiesta
        </text>

        <text attributes={TextAttributes.DIM}>
          Enter your access token from the WorkflowFiesta web app.
        </text>

        <box marginTop={1} flexDirection="column" gap={1}>
          <text>Access Token:</text>
          <PasswordInput
            value={token}
            onChange={setToken}
            onSubmit={handleSubmit}
            placeholder="wf_xxxx..."
            focused={activeField === 'token'}
            showToggle={true}
          />
        </box>

        <box flexDirection="column" gap={1}>
          <text attributes={TextAttributes.DIM}>API URL (optional, for self-hosted):</text>
          <box
            borderStyle="single"
            borderColor={activeField === 'apiUrl' ? BRAND_ORANGE : undefined}
            paddingX={1}
          >
            <input
              value={apiUrl}
              onInput={setApiUrl}
              onSubmit={handleSubmit as InputProps['onSubmit']}
              placeholder="https://api.example.com"
              flexGrow={1}
              focused={activeField === 'apiUrl'}
            />
          </box>
        </box>

        {error && (
          <text fg={themeColors.error}>Error: {error}</text>
        )}

        <box marginTop={1} flexDirection="row" gap={2}>
          <text attributes={TextAttributes.DIM}>
            [Enter] Submit
          </text>
          <text attributes={TextAttributes.DIM}>
            [Tab] Switch field
          </text>
          <text attributes={TextAttributes.DIM}>
            [Esc] Cancel
          </text>
        </box>

        {isSubmitting && (
          <text attributes={TextAttributes.DIM}>
            Validating token...
          </text>
        )}
      </box>
    </box>
  );
}

/** Props for the WelcomeScreen component. */
export interface WelcomeScreenProps {
  onLogin: () => void;
}

/** Welcome screen shown when not authenticated. */
export function WelcomeScreen({ onLogin: _onLogin }: WelcomeScreenProps) {
  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box flexDirection="column" alignItems="center" gap={2}>
        <ascii-font font="block" text="WorkflowFiesta" color={BRAND_ORANGE} />

        <text attributes={TextAttributes.DIM}>
          AI Agents for Your Entire Business
        </text>

        <box marginTop={2} flexDirection="column" alignItems="center" gap={1}>
          <text>
            Press <span fg={themeColors.info}>L</span> to sign in with your access token
          </text>
          <text attributes={TextAttributes.DIM}>
            or run: wf auth login --token {"<your-token>"}
          </text>
        </box>
      </box>
    </box>
  );
}

/** Props for the AuthGate component. */
export interface AuthGateProps {
  authService: AuthService;
  onAuthenticated: () => void;
}

/** Auth gate that shows welcome screen or login dialog. */
export function AuthGate({ authService, onAuthenticated }: AuthGateProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Handle 'L' key to open login dialog (only when not already showing it)
  useKeyboard((key) => {
    if (!showLoginDialog && (key.name === 'l' || key.name === 'L')) {
      setShowLoginDialog(true);
    }
  });

  if (showLoginDialog) {
    return (
      <AuthLoginDialog
        authService={authService}
        onSuccess={onAuthenticated}
        onCancel={() => setShowLoginDialog(false)}
      />
    );
  }

  return <WelcomeScreen onLogin={() => setShowLoginDialog(true)} />;
}
