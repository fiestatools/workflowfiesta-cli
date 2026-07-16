import { themeColors } from '../theme'

export interface ConnectionState {
  isConnecting: boolean
  isConnected: boolean
}

export interface ConnectionStatus {
  text: string
  color: string
}

export function getConnectionStatus(state: ConnectionState): ConnectionStatus {
  if (state.isConnecting) {
    return { text: 'Connecting...', color: themeColors.warning }
  }
  if (state.isConnected) {
    return { text: 'Connected', color: themeColors.success }
  }
  return { text: 'Disconnected', color: themeColors.error }
}
