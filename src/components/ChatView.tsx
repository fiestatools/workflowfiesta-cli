import type { ChatState, ChatService } from '../chat';
import type { Command } from '../commands';
import type { AuthService } from '../auth';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { StatusBar } from './StatusBar';
import { SidePanel } from './SidePanel';
import { CommandPalette } from './CommandPalette';
import { SettingsPanel } from './SettingsPanel';
import { RequestOverlay } from './RequestOverlay';
import { AgentPicker } from './AgentPicker';
import { HelpDialog } from './HelpDialog';
import { HistoryView } from './HistoryView';
import { AccessTokenRevealOverlay } from './AccessTokenRevealOverlay';

/** Which command-triggered overlay is currently open, if any. */
export type OverlayKind = 'agent' | 'help' | 'history' | null;

/** Main chat view component props. */
export interface ChatViewProps {
  state: ChatState;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  chatService: ChatService;
  version: string;
  overlay: OverlayKind;
  onOpenOverlay: (kind: OverlayKind) => void;
  onCloseOverlay: () => void;
  sidePanelVisible?: boolean;
  settingsVisible?: boolean;
  authService?: AuthService;
  onToggleSidePanel?: () => void;
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
  onClearChat?: () => void;
  onRetry?: () => void;
}

/** Main chat view layout. */
export function ChatView({
  state,
  input,
  onInputChange,
  onSubmit,
  isSubmitting,
  chatService,
  version,
  overlay,
  onOpenOverlay,
  onCloseOverlay,
  sidePanelVisible = false,
  settingsVisible = false,
  authService,
  onToggleSidePanel,
  onNewChat,
  onOpenSettings,
  onCloseSettings,
  onClearChat,
  onRetry,
}: ChatViewProps) {
  // The interactive request (if any) the run is parked on takes over the input.
  const activeRequest = state.pendingRequests[0];
  const reveal = state.pendingReveal;
  const anyOverlay = settingsVisible || Boolean(activeRequest) || Boolean(reveal) || overlay !== null;
  // Show command palette when input starts with / (but not when an overlay is open)
  const showCommandPalette = input.startsWith('/') && !anyOverlay;

  const handleCommandExecute = (command: Command) => {
    // Clear the input after command execution
    onInputChange('');

    // Execute the command
    switch (command.name) {
      case 'new':
        onNewChat?.();
        break;
      case 'clear':
        onClearChat?.();
        break;
      case 'settings':
        onOpenSettings?.();
        break;
      case 'panel':
        onToggleSidePanel?.();
        break;
      case 'agent':
        onOpenOverlay('agent');
        break;
      case 'help':
        onOpenOverlay('help');
        break;
      case 'version':
        onOpenOverlay('help');
        break;
      case 'history':
        onOpenOverlay('history');
        break;
      case 'retry':
        onRetry?.();
        break;
      case 'copy':
        void chatService.copyLastReply();
        break;
      case 'theme':
      case 'model':
        // Placeholders owned by the team — no CLI behavior wired up yet.
        break;
      default:
        break;
    }
  };

  const handleCommandClose = () => {
    onInputChange('');
  };

  return (
    <box flexDirection="row" flexGrow={1}>
      {/* Main chat area */}
      <box flexDirection="column" flexGrow={1}>
        <Header 
          agentName={state.currentAgent?.name}
          isConnected={state.isConnected}
          isConnecting={state.isConnecting}
        />
        
        <MessageList 
          messages={state.messages}
          isTyping={state.isTyping}
        />

        {/* Settings panel overlay */}
        {settingsVisible && authService && (
          <SettingsPanel
            authService={authService}
            onClose={onCloseSettings ?? (() => {})}
          />
        )}

        {/* Command palette overlay */}
        {showCommandPalette && (
          <CommandPalette
            input={input}
            onExecute={handleCommandExecute}
            onClose={handleCommandClose}
            onInputChange={onInputChange}
          />
        )}

        {/* Access-token reveal takes priority — the secret is shown only once. */}
        {reveal && (
          <AccessTokenRevealOverlay
            reveal={reveal}
            onCopy={() => chatService.copyReveal()}
            onDismiss={() => chatService.dismissReveal()}
          />
        )}

        {/* Interactive request overlay (credentials / MCP / OAuth) */}
        {!reveal && activeRequest && (
          <RequestOverlay request={activeRequest} chatService={chatService} />
        )}

        {/* Command-triggered overlays */}
        {!activeRequest && !reveal && overlay === 'agent' && (
          <AgentPicker
            agents={state.agents}
            currentAgentId={state.currentAgent?.uid}
            onSelect={(uid) => chatService.selectAgent(uid)}
            onClose={onCloseOverlay}
          />
        )}
        {!activeRequest && !reveal && overlay === 'help' && (
          <HelpDialog version={version} onClose={onCloseOverlay} />
        )}
        {!activeRequest && !reveal && overlay === 'history' && (
          <HistoryView
            conversations={chatService.listConversations()}
            currentUid={state.conversationUid}
            onSelect={(uid) => void chatService.switchConversation(uid)}
            onNew={() => onNewChat?.()}
            onForget={(uid) => chatService.forgetConversation(uid)}
            onClose={onCloseOverlay}
          />
        )}

        <InputArea
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          isDisabled={isSubmitting || state.isTyping || anyOverlay}
          isStreaming={state.isTyping}
          isCommandMode={showCommandPalette}
          placeholder="Type a message... (/ for commands)"
        />
        
        <StatusBar error={state.error} sidePanelVisible={sidePanelVisible} />
      </box>

      {/* Side panel */}
      <SidePanel state={state} isVisible={sidePanelVisible} />
    </box>
  );
}
