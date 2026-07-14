import { describe, expect, it } from 'bun:test'
import { filterCommands, findCommand, parseCommandInput } from './commands'

describe('parseCommandInput', () => {
  it('splits the command word from its arguments', () => {
    expect(parseCommandInput('rename My new title')).toEqual({ word: 'rename', args: 'My new title' })
  })

  it('returns empty args when only a word is typed', () => {
    expect(parseCommandInput('rename')).toEqual({ word: 'rename', args: '' })
  })

  it('preserves argument casing and trims surrounding whitespace', () => {
    expect(parseCommandInput('rename  Fix CI Runs  ')).toEqual({ word: 'rename', args: 'Fix CI Runs' })
  })

  it('handles empty input', () => {
    expect(parseCommandInput('')).toEqual({ word: '', args: '' })
  })
})

describe('findCommand', () => {
  it('finds the rename command by name', () => {
    expect(findCommand('rename')?.requiresArgs).toBe(true)
  })

  it('finds commands by alias', () => {
    expect(findCommand('n')?.name).toBe('new')
  })
})

describe('filterCommands', () => {
  it('matches by name prefix', () => {
    expect(filterCommands('ren').map(c => c.name)).toContain('rename')
  })
})
