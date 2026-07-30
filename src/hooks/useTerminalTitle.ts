import { useEffect } from 'react'
import { DEFAULT_TERMINAL_TITLE, resetTerminalTitle, setTerminalTitle } from '../utils/terminalTitle'

export interface UseTerminalTitleOptions {
  enabled: boolean
  explicitTitle?: string
  conversationTitle?: string
}

/**
 * Keeps the terminal title in sync with the active conversation. Precedence:
 * `--title` wins, else the conversation title, else {@link DEFAULT_TERMINAL_TITLE}.
 * The title is cleared when disabled and on unmount.
 */
export function useTerminalTitle({ enabled, explicitTitle, conversationTitle }: UseTerminalTitleOptions): void {
  useEffect(() => {
    if (!enabled) {
      resetTerminalTitle()
      return
    }
    const title = explicitTitle?.trim() || conversationTitle?.trim() || DEFAULT_TERMINAL_TITLE
    setTerminalTitle(title)
  }, [enabled, explicitTitle, conversationTitle])

  useEffect(() => resetTerminalTitle, [])
}
