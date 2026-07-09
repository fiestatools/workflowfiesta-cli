import type { KeyEvent, PasteEvent } from '@opentui/core';
import { useKeyboard, usePaste } from '@opentui/react';
import { themeColors } from '../theme';

/** Props for the masked (password) input. */
export interface MaskedInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Capture keystrokes only while this field is the focused one. */
  focused: boolean;
  placeholder?: string;
  /** Glyph shown per character (default `•`). */
  mask?: string;
}

/**
 * A single-line secret input that never renders the typed value — each
 * character shows as a `•`. opentui's `<input>` has no mask option, so this
 * captures keys itself (append / backspace) and bracketed paste, holding the
 * real value in the parent's state. Only the focused field consumes keys, so
 * several can coexist in a form. Navigation keys (Tab/Enter/arrows) are left
 * untouched for the surrounding form to handle.
 */
export function MaskedInput({ value, onChange, focused, placeholder = '', mask = '•' }: MaskedInputProps) {
  useKeyboard((key: KeyEvent) => {
    if (!focused) return;
    // Let modifier combos (shortcuts, Ctrl/Cmd+V) through untouched — pasted text
    // arrives via usePaste, not as keystrokes.
    if (key.ctrl || key.meta || key.super) return;

    if (key.name === 'backspace' || key.name === 'delete') {
      if (value.length > 0) onChange(value.slice(0, -1));
      return;
    }

    // Append only genuine printable characters; control/navigation keys carry a
    // sub-0x20 (or DEL) sequence and fall through for the form to act on.
    const seq = key.sequence;
    if (seq && seq.length === 1) {
      const code = seq.charCodeAt(0);
      if (code >= 32 && code !== 127) {
        onChange(value + seq);
      }
    }
  });

  usePaste((event: PasteEvent) => {
    if (!focused) return;
    const pasted = new TextDecoder().decode(event.bytes).replace(/[\r\n]+/g, '');
    if (pasted) onChange(value + pasted);
  });

  return (
    <text style={{ flexGrow: 1 }}>
      {focused ? (
        <>
          {value.length > 0 && <span fg={themeColors.text}>{mask.repeat(value.length)}</span>}
          <span fg={themeColors.primary}>█</span>
        </>
      ) : value.length > 0 ? (
        <span fg={themeColors.text}>{mask.repeat(value.length)}</span>
      ) : (
        <span fg={themeColors.textSubtle}>{placeholder}</span>
      )}
    </text>
  );
}
