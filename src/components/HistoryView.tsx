import { TextAttributes } from '@opentui/core';
import { useKeyboard } from '@opentui/react';
import { useState } from 'react';
import { themeColors, SUBTLE_BG, BRAND_ORANGE } from '../theme';
import type { StoredConversation } from '../config';

/** Props for the conversation history overlay. */
export interface HistoryViewProps {
  conversations: StoredConversation[];
  currentUid?: string;
  onSelect: (uid: string) => void;
  onNew: () => void;
  onForget: (uid: string) => void;
  onClose: () => void;
}

/** Compact relative-time label (e.g. "3h ago"). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Overlay listing locally remembered conversations. Selecting one reopens it
 * (messages are re-fetched from the backend). "New chat" starts a fresh thread;
 * "forget" removes an entry from local history only.
 */
export function HistoryView({ conversations, currentUid, onSelect, onNew, onForget, onClose }: HistoryViewProps) {
  // Own the list locally so forgetting a row updates the view immediately (the
  // store isn't React state, so a parent re-render wouldn't otherwise fire).
  const [items, setItems] = useState(conversations);
  // Row 0 is the "New chat" action; conversations follow.
  const rowCount = items.length + 1;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const clampedIndex = Math.min(selectedIndex, rowCount - 1);

  useKeyboard((key) => {
    if (key.name === 'escape') {
      onClose();
      return;
    }
    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : rowCount - 1));
    } else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') {
      setSelectedIndex((prev) => (prev < rowCount - 1 ? prev + 1 : 0));
    } else if (key.name === 'return') {
      if (clampedIndex === 0) {
        onNew();
      } else {
        const conv = items[clampedIndex - 1];
        if (conv) onSelect(conv.uid);
      }
      onClose();
    } else if (key.name === 'd' && clampedIndex > 0) {
      const conv = items[clampedIndex - 1];
      if (conv) {
        onForget(conv.uid);
        setItems((prev) => prev.filter((c) => c.uid !== conv.uid));
        // Keep the cursor in range after removal.
        setSelectedIndex((prev) => Math.min(prev, items.length - 1));
      }
    }
  });

  return (
    <box
      style={{
        position: 'absolute',
        bottom: 4,
        left: 0,
        width: '100%',
        zIndex: 100,
        backgroundColor: SUBTLE_BG,
        border: true,
        borderColor: BRAND_ORANGE,
        flexDirection: 'column',
        padding: 1,
      }}
    >
      <text>
        <span fg={themeColors.primary} attributes={TextAttributes.BOLD}> Conversation history</span>
      </text>
      <text fg={themeColors.textSubtle}> ↑↓ move · Enter open · d forget · Esc close</text>
      <text style={{ height: 1 }} />

      {/* New chat action */}
      <box flexDirection="row" paddingLeft={1}>
        <text style={{ width: 2 }}>
          <span fg={clampedIndex === 0 ? themeColors.primary : themeColors.text}>{clampedIndex === 0 ? '▸' : ' '}</span>
        </text>
        <text>
          <span fg={clampedIndex === 0 ? themeColors.primary : themeColors.success} attributes={clampedIndex === 0 ? TextAttributes.BOLD : undefined}>
            + New chat
          </span>
        </text>
      </box>

      {items.length === 0 ? (
        <text fg={themeColors.textMuted} paddingLeft={1}>No past conversations yet.</text>
      ) : (
        items.map((conv, index) => {
          const rowIndex = index + 1;
          const isSelected = clampedIndex === rowIndex;
          const isCurrent = conv.uid === currentUid;
          return (
            <box key={conv.uid} flexDirection="row" paddingLeft={1}>
              <text style={{ width: 2 }}>
                <span fg={isSelected ? themeColors.primary : themeColors.text}>{isSelected ? '▸' : ' '}</span>
              </text>
              <text style={{ flexGrow: 1 }}>
                <span fg={isSelected ? themeColors.primary : themeColors.text} attributes={isSelected ? TextAttributes.BOLD : undefined}>
                  {conv.title}
                </span>
                {isCurrent && <span fg={themeColors.success}> (current)</span>}
              </text>
              <text>
                <span fg={themeColors.textSubtle}>{relativeTime(conv.updatedAt)}</span>
              </text>
            </box>
          );
        })
      )}
    </box>
  );
}
