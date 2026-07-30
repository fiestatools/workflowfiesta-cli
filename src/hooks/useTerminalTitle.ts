import { useEffect } from 'react'
import { resetTerminalTitle, setTerminalTitle } from '../utils/terminalTitle'

export interface UseTerminalTitleOptions {
  enabled: boolean
  /** Fixed title from `--title`, which wins over the conversation title. */
  terminalTitle?: string
  conversationTitle?: string
}

export function useTerminalTitle({ enabled, terminalTitle, conversationTitle }: UseTerminalTitleOptions): void {
  useEffect(() => {
    if (!enabled) {
      resetTerminalTitle()
      return
    }
    setTerminalTitle(terminalTitle?.trim() || conversationTitle?.trim() || '')
  }, [enabled, terminalTitle, conversationTitle])

  useEffect(() => {
    return () => resetTerminalTitle()
  }, [])
}
