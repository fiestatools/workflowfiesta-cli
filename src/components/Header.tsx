import { TextAttributes } from '@opentui/core';
import { themeColors } from '../theme';

/** Props for the Header component. */
export interface HeaderProps {
  agentName?: string;
  isConnected: boolean;
  isConnecting: boolean;
}

/** Header with branding and connection status. */
export function Header({ agentName, isConnected, isConnecting }: HeaderProps) {
  const statusColor = isConnecting
    ? themeColors.warning
    : isConnected
      ? themeColors.primary
      : themeColors.textMuted;
  const statusText = isConnecting
    ? 'connecting'
    : isConnected
      ? 'connected'
      : 'disconnected';

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      paddingY={1}
    >
      <text attributes={TextAttributes.BOLD}>
        <span fg={themeColors.primary}>WorkflowFiesta</span>
        {agentName && <span fg={themeColors.textMuted}>{' '}{agentName}</span>}
      </text>
      <text attributes={TextAttributes.DIM}>
        <span fg={statusColor}>●</span>
        <span fg={themeColors.textMuted}>{' '}{statusText}</span>
      </text>
    </box>
  );
}
