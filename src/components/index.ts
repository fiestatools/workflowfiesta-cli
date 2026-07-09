// Layout components
export { Header } from './Header';
export type { HeaderProps } from './Header';

export { Message } from './Message';
export type { MessageProps } from './Message';

export { MessageList } from './MessageList';
export type { MessageListProps } from './MessageList';

export { InputArea } from './InputArea';
export type { InputAreaProps } from './InputArea';

export { StatusBar } from './StatusBar';
export type { StatusBarProps } from './StatusBar';

export { ChatView } from './ChatView';
export type { ChatViewProps } from './ChatView';

// UI components
export { LoadingSpinner } from './LoadingSpinner';
export { ToolActivity } from './ToolActivity';
export type { ToolActivityProps } from './ToolActivity';
export { MarkdownText } from './MarkdownText';
export type { MarkdownTextProps } from './MarkdownText';
export { CommandPalette } from './CommandPalette';
export type { CommandPaletteProps } from './CommandPalette';

// Auth components
export { AuthLoginDialog, WelcomeScreen, AuthGate } from './AuthLogin';
export type { AuthLoginProps, WelcomeScreenProps, AuthGateProps } from './AuthLogin';

// Settings
export { SettingsPanel } from './SettingsPanel';
export type { SettingsPanelProps } from './SettingsPanel';

// Side panel
export { SidePanel, SIDE_PANEL_WIDTH } from './SidePanel';
export type { SidePanelProps } from './SidePanel';

// Interactive request forms
export { RequestOverlay } from './RequestOverlay';
export type { RequestOverlayProps } from './RequestOverlay';
export { CredentialRequestForm } from './CredentialRequestForm';
export { McpSetupForm } from './McpSetupForm';
export { OAuthRequestPrompt } from './OAuthRequestPrompt';
export { AccessTokenCard } from './AccessTokenCard';
export type { AccessTokenCardProps } from './AccessTokenCard';
export { AccessTokenRevealOverlay } from './AccessTokenRevealOverlay';
export type { AccessTokenRevealOverlayProps } from './AccessTokenRevealOverlay';
export { MaskedInput } from './MaskedInput';
export type { MaskedInputProps } from './MaskedInput';
export { PasswordInput } from './PasswordInput';
export type { PasswordInputProps } from './PasswordInput';

// Overlays
export { AgentPicker } from './AgentPicker';
export type { AgentPickerProps } from './AgentPicker';
export { HelpDialog } from './HelpDialog';
export type { HelpDialogProps } from './HelpDialog';
export { HistoryView } from './HistoryView';
export type { HistoryViewProps } from './HistoryView';

// Hooks
export { useChatState, useInput } from '../hooks';

// App-level components
export { LoadingScreen } from './LoadingScreen';
export type { LoadingScreenProps } from './LoadingScreen';
export { ChatInterface } from './ChatInterface';
export type { ChatInterfaceProps } from './ChatInterface';
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';
