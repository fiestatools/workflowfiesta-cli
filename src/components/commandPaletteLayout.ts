import type { Command } from '../commands'

export interface CommandGroup {
  category: string
  commands: Command[]
}

const CHROME_ROWS = 3
const MAX_PALETTE_ROWS = 15

export function groupCommands(commands: Command[]): CommandGroup[] {
  const groups: CommandGroup[] = []
  for (const command of commands) {
    const group = groups.find(g => g.category === command.category)
    if (group) {
      group.commands.push(command)
    }
    else {
      groups.push({ category: command.category, commands: [command] })
    }
  }
  return groups
}

function listRows(groups: CommandGroup[]): number {
  return groups.reduce((rows, group) => rows + group.commands.length + 1, 0)
}

export function paletteHeight(groups: CommandGroup[]): number {
  return Math.min(listRows(groups) + CHROME_ROWS, MAX_PALETTE_ROWS)
}

export function viewportRows(groups: CommandGroup[]): number {
  return paletteHeight(groups) - CHROME_ROWS
}

export function commandRow(groups: CommandGroup[], index: number): number {
  let row = 0
  let seen = 0
  for (const group of groups) {
    row += 1
    if (index < seen + group.commands.length) {
      return row + (index - seen)
    }
    row += group.commands.length
    seen += group.commands.length
  }
  return 0
}

export function scrollTopFor(row: number, currentTop: number, rows: number): number {
  if (row < currentTop) {
    return row
  }
  if (row >= currentTop + rows) {
    return row - rows + 1
  }
  return currentTop
}
