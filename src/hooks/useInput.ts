import { useState, useCallback } from 'react';
import type { ChatService } from '../chat';

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
