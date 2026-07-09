import { useState, useEffect, useCallback } from 'react';
import type { ChatService, ChatState, ChatMessage } from '../chat';

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

/**
 * Hook to manage input state.
 */
export function useInput(chatService: ChatService) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await chatService.sendMessage(input);
      setInput('');
    } finally {
      setIsSubmitting(false);
    }
  }, [input, isSubmitting, chatService]);

  return {
    input,
    setInput,
    isSubmitting,
    handleSubmit,
  };
}
