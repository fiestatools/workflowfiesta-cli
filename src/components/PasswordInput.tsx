import type { KeyEvent, PasteEvent } from '@opentui/core';
import { useKeyboard, usePaste } from '@opentui/react';
import { useState } from 'react';
import { themeColors, BRAND_ORANGE } from '../theme';

export interface PasswordInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  mask?: string;
  showToggle?: boolean;
  label?: string;
  focused?: boolean;
  cursor?: string;
}

/**
 * Password input component with optional visibility toggle.
 * Shows masked characters by default, with Ctrl+R to toggle visibility.
 */
export function PasswordInput({
  value: controlledValue,
  onChange,
  onSubmit,
  placeholder = '',
  mask = '•',
  showToggle = false,
  label,
  focused = true,
  cursor = '█',
}: PasswordInputProps) {
  const [internalValue, setInternalValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const value = controlledValue ?? internalValue;

  const setValue = (newVal: string) => {
    if (onChange) {
      onChange(newVal);
    } else {
      setInternalValue(newVal);
    }
  };

  useKeyboard((key: KeyEvent) => {
    if (!focused) return;

    // Handle visibility toggle with Ctrl+R (reveal)
    if (showToggle && key.ctrl && key.name === 'r') {
      setIsVisible((v) => !v);
      return;
    }

    // Let other modifier combos through
    if (key.ctrl || key.meta || key.super) return;

    // Handle submit
    if (key.name === 'return') {
      onSubmit?.(value);
      return;
    }

    // Handle backspace/delete
    if (key.name === 'backspace' || key.name === 'delete') {
      if (value.length > 0) setValue(value.slice(0, -1));
      return;
    }

    // Ignore navigation keys
    if (
      key.name === 'escape' ||
      key.name === 'up' ||
      key.name === 'down' ||
      key.name === 'tab'
    ) {
      return;
    }

    // Append printable characters
    const seq = key.sequence;
    if (seq && seq.length === 1) {
      const code = seq.charCodeAt(0);
      if (code >= 32 && code !== 127) {
        setValue(value + seq);
      }
    }
  });

  usePaste((event: PasteEvent) => {
    if (!focused) return;
    const pasted = new TextDecoder().decode(event.bytes).replace(/[\r\n]+/g, '');
    if (pasted) setValue(value + pasted);
  });

  const displayValue = isVisible ? value : mask.repeat(value.length);

  return (
    <box flexDirection="column">
      {label && (
        <text>
          <b>{label}</b>
        </text>
      )}
      <box flexDirection="row" alignItems="center" gap={1}>
        <box
          borderStyle="single"
          borderColor={focused ? BRAND_ORANGE : themeColors.border}
          paddingX={1}
          flexGrow={1}
        >
          <text style={{ flexGrow: 1 }}>
            {focused ? (
              <>
                {value.length > 0 ? (
                  <span fg={themeColors.text}>{displayValue}</span>
                ) : (
                  <span fg={themeColors.textSubtle}>{placeholder}</span>
                )}
                <span fg={themeColors.primary}>{cursor}</span>
              </>
            ) : value.length > 0 ? (
              <span fg={themeColors.text}>{displayValue}</span>
            ) : (
              <span fg={themeColors.textSubtle}>{placeholder}</span>
            )}
          </text>
        </box>
        {showToggle && focused && (
          <text fg={themeColors.textMuted}>
            {isVisible ? '[Ctrl+R hide]' : '[Ctrl+R show]'}
          </text>
        )}
      </box>
    </box>
  );
}
