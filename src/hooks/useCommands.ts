import type { Command } from '../commands'
import { useEffect, useState } from 'react'
import { getCommandRegistry } from '../commands'

/** Subscribe to the merged command list so the palette repaints on changes. */
export function useCommands(): Command[] {
  const registry = getCommandRegistry()
  const [commands, setCommands] = useState<Command[]>(() => registry.getCommands())

  useEffect(() => {
    return registry.subscribe(setCommands)
  }, [registry])

  return commands
}
