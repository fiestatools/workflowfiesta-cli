import type { Services } from '../services'
import type { OverlayKind } from './ChatView'
import { useKeyboard } from '@opentui/react'
import { useEffect, useState } from 'react'
import { CLI_VERSION } from '../cli'
import { ChatView, useChatState, useInput } from './index'

export interface ChatInterfaceProps {
  services: Services
}

/** Main chat interface with keyboard shortcuts and state management. */
export function ChatInterface({ services }: ChatInterfaceProps) {
  const state = useChatState(services.chatService)
  const {
    input,
    setInput,
    isSubmitting,
    handleSubmit,
    navigateHistoryUp,
    navigateHistoryDown,
    resetHistoryNavigation,
  } = useInput(services.chatService)
  const [sidePanelVisible, setSidePanelVisible] = useState(true)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [overlay, setOverlay] = useState<OverlayKind>(null)

  const toggleSidePanel = () => setSidePanelVisible(prev => !prev)
  const openSettings = () => setSettingsVisible(true)
  const closeSettings = () => setSettingsVisible(false)
  const openOverlay = (kind: OverlayKind) => setOverlay(kind)
  const closeOverlay = () => setOverlay(null)
  const newChat = () => {
    setOverlay(null)
    setSettingsVisible(false)
    services.chatService.newChat()
  }
  const clearChat = () => services.chatService.clearChat()
  const retry = () => services.chatService.retryLastMessage()

  // Global shortcuts. A command overlay or a parked interactive request is modal:
  // it owns the keyboard, so the panel/settings toggles are suppressed while one
  // is open (Ctrl+N always resets). This keeps exactly one modal on screen.
  useKeyboard((key) => {
    const modalOpen = overlay !== null || state.pendingRequests.length > 0 || Boolean(state.pendingReveal)

    // Esc interrupts an in-flight run. Skipped while a modal is open (its own
    // handler owns Esc) so cancelling a form never also aborts a run.
    if (key.name === 'escape') {
      if (state.isTyping && !modalOpen && !settingsVisible) {
        services.chatService.stopRun()
      }
      return
    }

    if (!key.ctrl)
      return

    switch (key.name) {
      case 's':
        // Always allow closing settings; only open it when nothing else is modal.
        if (settingsVisible)
          closeSettings()
        else if (!modalOpen)
          openSettings()
        break
      case 'b':
        if (!modalOpen && !settingsVisible)
          toggleSidePanel()
        break
      case 'n':
        newChat()
        break
      case 'y':
        // Copy last reply to clipboard
        if (!modalOpen && !settingsVisible)
          void services.chatService.copyLastReply()
        break
      default:
        break
    }
  })

  useEffect(() => {
    void services.chatService.initialize()
  }, [services.chatService])

  return (
    <ChatView
      state={state}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      chatService={services.chatService}
      version={CLI_VERSION}
      overlay={overlay}
      onOpenOverlay={openOverlay}
      onCloseOverlay={closeOverlay}
      sidePanelVisible={sidePanelVisible}
      settingsVisible={settingsVisible}
      authService={services.auth}
      settingsService={services.settingsService}
      onToggleSidePanel={toggleSidePanel}
      onNewChat={newChat}
      onOpenSettings={openSettings}
      onCloseSettings={closeSettings}
      onClearChat={clearChat}
      onRetry={retry}
      onHistoryUp={navigateHistoryUp}
      onHistoryDown={navigateHistoryDown}
      onHistoryReset={resetHistoryNavigation}
    />
  )
}
