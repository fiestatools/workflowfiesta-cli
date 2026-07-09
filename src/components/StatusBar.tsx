import { TextAttributes } from '@opentui/core';
import { themeColors } from '../theme';

/** Props for the status bar. */
export interface StatusBarProps {
  error?: string;
  sidePanelVisible?: boolean;
}

/** Status bar for errors and hints. */
export function StatusBar({ error, sidePanelVisible }: StatusBarProps) {
  if (!error) {
    const sidePanelHint = sidePanelVisible ? 'Ctrl+B hide panel' : 'Ctrl+B panel';
    return (
      <box paddingX={1}>
        <text attributes={TextAttributes.DIM}>
          Enter send • Ctrl+S settings • {sidePanelHint} • Ctrl+C quit
        </text>
      </box>
    );
  }

  return (
    <box paddingX={1}>
      <text fg={themeColors.error}>Error: {error}</text>
    </box>
  );
}
