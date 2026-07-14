import type { StoredConversation } from '../config'
import { TextAttributes } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { useState } from 'react'
import { BRAND_ORANGE, SUBTLE_BG, themeColors } from '../theme'
import { truncateText } from '../utils/truncateText'

/** Max title length shown in the delete-confirmation prompt. */
const CONFIRM_TITLE_MAX_LENGTH = 30

/** Props for the conversation history overlay. */
export interface HistoryViewProps {
  conversations: StoredConversation[]
  currentUid?: string
  onSelect: (uid: string) => void
  onNew: () => void
  onForget: (uid: string) => void
  onRename: (uid: string, title: string) => void
  onClose: () => void
}

/** Compact relative-time label (e.g. "3h ago"). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then))
    return ''
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60)
    return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)
    return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * Overlay listing locally remembered conversations. Selecting one reopens it
 * (messages are re-fetched from the backend). Rows can be renamed (r) and
 * deleted (d) with confirmation; Space marks rows for bulk delete. Deleting
 * only forgets the local index entry — the backend thread is untouched.
 */
export function HistoryView({ conversations, currentUid, onSelect, onNew, onForget, onRename, onClose }: HistoryViewProps) {
  // Own the list locally so mutations update the view immediately (the store
  // isn't React state, so a parent re-render wouldn't otherwise fire).
  const [items, setItems] = useState(conversations)
  // Row 0 is the "New chat" action; conversations follow.
  const rowCount = items.length + 1
  const [selectedIndex, setSelectedIndex] = useState(0)
  // UIDs marked with Space for bulk delete.
  const [marked, setMarked] = useState<ReadonlySet<string>>(() => new Set())
  // Row being renamed inline, if any.
  const [renamingUid, setRenamingUid] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  // UIDs awaiting delete confirmation, if any.
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null)

  const clampedIndex = Math.min(selectedIndex, rowCount - 1)
  const selectedConversation = clampedIndex > 0 ? items[clampedIndex - 1] : undefined

  // Takes the submitted text as an argument (rather than reading state) because
  // the input's change event lands in the same tick as submit — state would
  // still hold the pre-edit title here.
  const commitRename = (submitted: string) => {
    if (!renamingUid)
      return
    const title = submitted.trim()
    if (title) {
      onRename(renamingUid, title)
      setItems(prev => prev.map(c => (c.uid === renamingUid ? { ...c, title } : c)))
    }
    setRenamingUid(null)
    setRenameValue('')
  }

  const confirmDelete = () => {
    if (!pendingDelete)
      return
    for (const uid of pendingDelete) {
      onForget(uid)
    }
    const remaining = items.filter(c => !pendingDelete.includes(c.uid))
    setItems(remaining)
    // Keep the cursor in range after removal (max index = remaining.length).
    setSelectedIndex(prev => Math.min(prev, remaining.length))
    setMarked(new Set())
    setPendingDelete(null)
  }

  useKeyboard((key) => {
    // Renaming: the focused input owns typing, and its onSubmit handles Enter
    // (it carries the fresh text). Only Esc (cancel) is handled here.
    if (renamingUid) {
      if (key.name === 'escape') {
        setRenamingUid(null)
        setRenameValue('')
      }
      return
    }

    // Delete confirmation owns the keyboard until resolved.
    if (pendingDelete) {
      if (key.name === 'y' || key.name === 'return') {
        confirmDelete()
      }
      else if (key.name === 'n' || key.name === 'escape') {
        setPendingDelete(null)
      }
      return
    }

    if (key.name === 'escape') {
      // First Esc clears any marks; the next closes the overlay.
      if (marked.size > 0) {
        setMarked(new Set())
      }
      else {
        onClose()
      }
      return
    }
    if (key.name === 'up' || key.name === 'k') {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : rowCount - 1))
    }
    else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') {
      setSelectedIndex(prev => (prev < rowCount - 1 ? prev + 1 : 0))
    }
    else if (key.name === 'return') {
      if (clampedIndex === 0) {
        onNew()
      }
      else if (selectedConversation) {
        onSelect(selectedConversation.uid)
      }
      onClose()
    }
    else if (key.name === 'space' && selectedConversation) {
      const uid = selectedConversation.uid
      setMarked((prev) => {
        const next = new Set(prev)
        if (next.has(uid))
          next.delete(uid)
        else
          next.add(uid)
        return next
      })
    }
    else if (key.name === 'r' && selectedConversation) {
      setRenamingUid(selectedConversation.uid)
      setRenameValue(selectedConversation.title)
    }
    else if (key.name === 'd') {
      if (marked.size > 0) {
        setPendingDelete([...marked])
      }
      else if (selectedConversation) {
        setPendingDelete([selectedConversation.uid])
      }
    }
  })

  const confirmLabel = pendingDelete
    ? pendingDelete.length === 1
      ? `Delete "${truncateText(items.find(c => c.uid === pendingDelete[0])?.title ?? 'this conversation', CONFIRM_TITLE_MAX_LENGTH)}"?`
      : `Delete ${pendingDelete.length} conversations?`
    : null

  const hint = renamingUid
    ? 'Enter save · Esc cancel'
    : pendingDelete
      ? 'y confirm · n cancel'
      : '↑↓ move · Enter open · r rename · Space mark · d delete · Esc close'

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
      {confirmLabel
        ? (
            <text>
              <span
                fg={themeColors.warning}
                attributes={TextAttributes.BOLD}
              >
                {' '}
                {confirmLabel}
              </span>
              <span fg={themeColors.textSubtle}>
                {' '}
                {hint}
              </span>
            </text>
          )
        : (
            <text fg={themeColors.textSubtle}>
              {' '}
              {hint}
            </text>
          )}
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

      {items.length === 0
        ? (
            <text fg={themeColors.textMuted} paddingLeft={1}>No past conversations yet.</text>
          )
        : (
            items.map((conv, index) => {
              const rowIndex = index + 1
              const isSelected = clampedIndex === rowIndex
              const isCurrent = conv.uid === currentUid
              const isMarked = marked.has(conv.uid)
              const isPendingDelete = pendingDelete?.includes(conv.uid) ?? false
              const isRenaming = renamingUid === conv.uid
              return (
                <box key={conv.uid} flexDirection="row" paddingLeft={1}>
                  <text style={{ width: 2 }}>
                    <span fg={isSelected ? themeColors.primary : themeColors.text}>{isSelected ? '▸' : ' '}</span>
                  </text>
                  <text style={{ width: 2 }}>
                    <span fg={isPendingDelete ? themeColors.error : themeColors.warning}>
                      {isPendingDelete ? '✗' : isMarked ? '✓' : ' '}
                    </span>
                  </text>
                  {isRenaming
                    ? (
                        <input
                          value={renameValue}
                          onInput={setRenameValue}
                          onSubmit={(value: unknown) => commitRename(typeof value === 'string' ? value : renameValue)}
                          placeholder={conv.title}
                          placeholderColor={themeColors.textSubtle}
                          textColor={themeColors.text}
                          focused={true}
                          style={{ flexGrow: 1 }}
                        />
                      )
                    : (
                        <text style={{ flexGrow: 1 }}>
                          <span fg={isSelected ? themeColors.primary : themeColors.text} attributes={isSelected ? TextAttributes.BOLD : undefined}>
                            {conv.title}
                          </span>
                          {isCurrent && <span fg={themeColors.success}> (current)</span>}
                        </text>
                      )}
                  <text>
                    <span fg={themeColors.textSubtle}>{relativeTime(conv.updatedAt)}</span>
                  </text>
                </box>
              )
            })
          )}
    </box>
  )
}
