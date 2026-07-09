import type { ChatService, PendingRequest } from '../chat';
import { CredentialRequestForm } from './CredentialRequestForm';
import { McpSetupForm } from './McpSetupForm';
import { OAuthRequestPrompt } from './OAuthRequestPrompt';

/** Props for the interactive request overlay. */
export interface RequestOverlayProps {
  request: PendingRequest;
  chatService: ChatService;
}

/**
 * Renders the interactive form for the active parked-run request, wiring its
 * submit/test/cancel callbacks to {@link ChatService}. Fulfilling or cancelling
 * a request dequeues it, which unmounts this overlay (or advances to the next).
 */
export function RequestOverlay({ request, chatService }: RequestOverlayProps) {
  switch (request.kind) {
    case 'credential':
      return (
        <CredentialRequestForm
          event={request.event}
          onSubmit={(fields) => chatService.submitCredential(request.event.requestId, fields)}
          onTest={(fields) => chatService.testCredential(request.event.requestId, fields)}
          onCancel={() => void chatService.cancelPendingRequest(request.event.requestId, 'credential')}
        />
      );
    case 'mcp':
      return (
        <McpSetupForm
          event={request.event}
          onSubmit={(fields) => chatService.submitMcpSetup(request.event.requestId, fields)}
          onAuthorize={(credentialId) => chatService.authorizeMcp(credentialId)}
          onDismiss={() => chatService.dismissMcpRequest(request.event.requestId)}
          onCancel={() => void chatService.cancelPendingRequest(request.event.requestId, 'mcp')}
        />
      );
    case 'oauth':
      return (
        <OAuthRequestPrompt
          event={request.event}
          onConnect={() => chatService.connectOAuth(request.event.requestId)}
          onCancel={() => void chatService.cancelPendingRequest(request.event.requestId, 'oauth')}
        />
      );
    default:
      return null;
  }
}
