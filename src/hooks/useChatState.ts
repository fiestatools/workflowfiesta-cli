import { useState, useEffect } from 'react';
import type { ChatService, ChatState } from '../chat';

/**
 * Hook to subscribe to chat service state.
 */
export function useChatState(chatService: ChatService): ChatState {
  const [state, setState] = useState<ChatState>(chatService.getState());

  useEffect(() => {
    return chatService.subscribe(setState);
  }, [chatService]);

  return state;
}
