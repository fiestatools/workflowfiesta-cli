import type { Command } from '../slash-commands'
import { useEffect, useState } from 'react'
import { getCommandRegistry } from '../slash-commands'

/** Subscribe to the merged command list so the palette repaints on changes. */
export function useCommands(): Command[] {
  const registry = getCommandRegistry()
  const [commands, setCommands] = useState<Command[]>(() => registry.getCommands())

  useEffect(() => {
    return registry.subscribe(setCommands)
  }, [registry])

  return commands
}
