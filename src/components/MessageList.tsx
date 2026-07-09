import { TextAttributes } from '@opentui/core';
import type { ChatMessage } from '../chat';
import { Message } from './Message';

/** Props for the message list. */
export interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

/** List of chat messages. */
export function MessageList({ messages, isTyping }: MessageListProps) {
  // Check if the last message is already streaming (has spinner)
  const lastMessage = messages[messages.length - 1];
  const hasStreamingMessage = lastMessage?.isStreaming === true;
  
  return (
    <scrollbox
      flexGrow={1}
      stickyScroll={true}
      stickyStart="bottom"
      contentOptions={{
        flexDirection: 'column',
        padding: 1,
      }}
      marginBottom={1}
    >
      {messages.length === 0 ? (
        <box alignItems="center" justifyContent="center" flexGrow={1}>
          <text attributes={TextAttributes.DIM}>
            Start a conversation by typing a message below.
          </text>
        </box>
      ) : (
        messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))
      )}
    </scrollbox>
  );
}
