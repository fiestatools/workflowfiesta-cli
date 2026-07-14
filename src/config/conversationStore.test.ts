import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { ConversationStore } from './conversationStore'

describe('ConversationStore', () => {
  let dir: string
  let store: ConversationStore

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'wf-conv-store-'))
    store = new ConversationStore(dir)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('renames an existing conversation and persists it', () => {
    store.upsert({ uid: 'c1', title: 'Original title' })
    store.rename('c1', 'New title')

    expect(store.list().find(c => c.uid === 'c1')?.title).toBe('New title')
    // A fresh store re-reads from disk.
    const reloaded = new ConversationStore(dir)
    expect(reloaded.list().find(c => c.uid === 'c1')?.title).toBe('New title')
  })

  it('keeps a renamed title on later upserts', () => {
    store.upsert({ uid: 'c1', title: 'Original title' })
    store.rename('c1', 'New title')
    store.upsert({ uid: 'c1', title: 'Follow-up message' })

    expect(store.list().find(c => c.uid === 'c1')?.title).toBe('New title')
  })

  it('ignores renames for unknown uids and empty titles', () => {
    store.upsert({ uid: 'c1', title: 'Original title' })
    store.rename('missing', 'Whatever')
    store.rename('c1', '')

    expect(store.list()).toHaveLength(1)
    expect(store.list()[0]?.title).toBe('Original title')
  })

  it('removes conversations', () => {
    store.upsert({ uid: 'c1', title: 'One' })
    store.upsert({ uid: 'c2', title: 'Two' })
    store.remove('c1')

    expect(store.list().map(c => c.uid)).toEqual(['c2'])
  })
})
