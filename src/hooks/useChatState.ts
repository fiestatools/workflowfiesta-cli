import type { ChatService, ChatState } from '../chat'
import { useEffect, useState } from 'react'

/**
 * Hook to subscribe to chat service state.
 */
export function useChatState(chatService: ChatService): ChatState {
  const [state, setState] = useState<ChatState>(chatService.getState())

  useEffect(() => {
    return chatService.subscribe(setState)
  }, [chatService])

  return state
}
