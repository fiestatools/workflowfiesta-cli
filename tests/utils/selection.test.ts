import { describe, expect, it, mock } from 'bun:test'
import { copySelection } from '../../src/utils/selection'

function createMockRenderer(hasSelection: boolean, selectedText: string = '') {
  return {
    hasSelection,
    getSelection: mock(() => hasSelection
      ? { getSelectedText: () => selectedText }
      : null),
    clearSelection: mock(() => {}),
  }
}

describe('copySelection', () => {
  it('returns false when no selection exists', async () => {
    const renderer = createMockRenderer(false)
    const result = await copySelection(renderer as any)
    expect(result).toBe(false)
  })

  it('returns false when selected text is empty', async () => {
    const renderer = createMockRenderer(true, '')
    const result = await copySelection(renderer as any)
    expect(result).toBe(false)
  })

  it('clears selection after copying', async () => {
    const renderer = createMockRenderer(true, 'some text')
    await copySelection(renderer as any)
    expect(renderer.clearSelection).toHaveBeenCalled()
  })
})
