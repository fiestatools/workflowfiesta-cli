import { TextAttributes } from '@opentui/core';
import { useKeyboard } from '@opentui/react';
import { useMemo, useState } from 'react';
import { themeColors, SUBTLE_BG, BRAND_ORANGE } from '../theme';
import { MaskedInput } from './MaskedInput';
import { logger } from '../logger';
import type { CredentialRequestEvent } from '../runs/runEvents';
import type { CredentialTestResult } from '../chat';

/** Props for the credential request form. */
export interface CredentialRequestFormProps {
  event: CredentialRequestEvent;
  onSubmit: (fields: Record<string, string>) => Promise<void>;
  onTest: (fields: Record<string, string>) => Promise<CredentialTestResult>;
  onCancel: () => void;
}

type Action = 'test' | 'submit' | 'cancel';
type Status = 'idle' | 'submitting' | 'testing';

/**
 * Interactive form for a parked run's `request_credentials` tool. Each field is
 * a live input — the first is focused on open, so you type/paste straight away
 * and Tab / ↓ / Enter move to the next field (then the Test/Submit/Cancel
 * actions). Mirrors the extension's credential card.
 */
export function CredentialRequestForm({ event, onSubmit, onTest, onCancel }: CredentialRequestFormProps) {
  const fields = event.fields;
  const actions: Action[] = fields.length > 0 ? ['test', 'submit', 'cancel'] : ['submit', 'cancel'];
  const rowCount = fields.length + actions.length;

  const [values, setValues] = useState<Record<string, string>>({});
  // The focused row: 0..fields.length-1 are fields, then the action buttons.
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | undefined>();
  const [testResult, setTestResult] = useState<CredentialTestResult | undefined>();

  const missingRequired = useMemo(
    () => fields.filter((f) => !f.optional && !values[f.key]?.trim()).map((f) => f.label),
    [fields, values],
  );

  const setValue = (key: string, value: string): void =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const move = (delta: number): void =>
    setFocusedIndex((prev) => (prev + delta + rowCount) % rowCount);

  const runSubmit = async (): Promise<void> => {
    if (missingRequired.length > 0) {
      setError(`Required: ${missingRequired.join(', ')}`);
      return;
    }
    setStatus('submitting');
    setError(undefined);
    try {
      await onSubmit(values);
      // On success the overlay is torn down by the service; nothing more to do.
    } catch (err) {
      logger.error(`[credential] submit failed: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('idle');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const runTest = async (): Promise<void> => {
    setStatus('testing');
    setError(undefined);
    setTestResult(undefined);
    try {
      setTestResult(await onTest(values));
    } catch (err) {
      logger.error(`[credential] test failed: ${err instanceof Error ? err.message : String(err)}`);
      setTestResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setStatus('idle');
    }
  };

  const runAction = (action: Action): void => {
    if (status !== 'idle') return;
    if (action === 'submit') void runSubmit();
    else if (action === 'test') void runTest();
    else onCancel();
  };

  useKeyboard((key) => {
    if (status !== 'idle') {
      if (key.name === 'escape') onCancel();
      return;
    }
    if (key.name === 'escape') {
      onCancel();
    } else if (key.name === 'tab') {
      move(key.shift ? -1 : 1);
    } else if (key.name === 'down') {
      move(1);
    } else if (key.name === 'up') {
      move(-1);
    } else if (key.name === 'return') {
      if (focusedIndex < fields.length) {
        // Advance through fields; from the last field jump to the first action.
        move(1);
      } else {
        runAction(actions[focusedIndex - fields.length]!);
      }
    }
  });

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
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}> {event.label}</span>
      </text>
      {event.provider && (
        <text fg={themeColors.textMuted}> Provider: {event.provider}</text>
      )}
      {event.instructions && (
        <text fg={themeColors.textSubtle}> {event.instructions}</text>
      )}
      <text fg={themeColors.textSubtle}> Type to fill · Tab/↓/Enter next field · Esc dismiss</text>
      <text style={{ height: 1 }} />

      {fields.map((field, index) => {
        const isFocused = focusedIndex === index;
        return (
          <box key={field.key} flexDirection="row" paddingLeft={1}>
            <text style={{ width: 2 }}>
              <span fg={isFocused ? themeColors.primary : themeColors.text}>{isFocused ? '▸' : ' '}</span>
            </text>
            <text style={{ width: 20 }}>
              <span fg={isFocused ? themeColors.primary : themeColors.text}>
                {field.label}{field.optional ? '' : ' *'}:
              </span>
            </text>
            {field.type === 'password' ? (
              <MaskedInput
                value={values[field.key] ?? ''}
                onChange={(v) => setValue(field.key, v)}
                placeholder={field.hint ?? ''}
                focused={isFocused}
              />
            ) : (
              <input
                value={values[field.key] ?? ''}
                onChange={(v: string) => setValue(field.key, v)}
                placeholder={field.hint ?? ''}
                placeholderColor={themeColors.textSubtle}
                textColor={themeColors.text}
                focused={isFocused}
                style={{ flexGrow: 1 }}
              />
            )}
          </box>
        );
      })}

      <text style={{ height: 1 }} />

      {/* Action row */}
      <box flexDirection="row" paddingLeft={1} gap={2}>
        {actions.map((action, i) => {
          const rowIndex = fields.length + i;
          const isFocused = focusedIndex === rowIndex;
          const label = action === 'submit' ? 'Submit' : action === 'test' ? 'Test' : 'Cancel';
          const color = action === 'cancel' ? themeColors.error : themeColors.primary;
          return (
            <text key={action}>
              <span fg={isFocused ? color : themeColors.textMuted} attributes={isFocused ? TextAttributes.BOLD : undefined}>
                {isFocused ? '▸ ' : '  '}{label}
              </span>
            </text>
          );
        })}
      </box>

      {status !== 'idle' && (
        <text fg={themeColors.info} paddingLeft={1}>
          {status === 'submitting' ? 'Submitting…' : 'Testing…'}
        </text>
      )}
      {testResult && (
        <text paddingLeft={1}>
          <span fg={testResult.ok ? themeColors.success : testResult.unsupported ? themeColors.warning : themeColors.error}>
            {testResult.ok ? '✓ ' : testResult.unsupported ? '! ' : '✗ '}
            {testResult.ok
              ? (testResult.detail ?? 'Credentials valid')
              : (testResult.error ?? 'Validation failed')}
          </span>
        </text>
      )}
      {error && (
        <text fg={themeColors.error} paddingLeft={1}>{error}</text>
      )}
    </box>
  );
}
