import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { CredentialStore } from '../src/auth/credentialStore'

describe('CredentialStore', () => {
  it('logout keeps the next active account\'s API URL', async () => {
    const store = new CredentialStore(mkdtempSync(join(tmpdir(), 'wf-creds-')), null)
    await store.setAccount({ name: 'work', token: 'w', apiUrlOverride: 'https://w' })
    await store.setAccount({ name: 'home', token: 'h' })
    await store.switchAccount('home')

    await store.clearToken()

    expect(await store.getActiveAccountName()).toBe('work')
    expect(await store.getApiUrlOverride()).toBe('https://w')
  })

  it('legacy logout clears token and API URL', async () => {
    const store = new CredentialStore(mkdtempSync(join(tmpdir(), 'wf-creds-')), null)
    await store.setToken('t')
    await store.setApiUrlOverride('https://a')

    await store.clearToken()

    expect(await store.getToken()).toBeUndefined()
    expect(await store.getApiUrlOverride()).toBeUndefined()
  })

  it('writes atomically without leaving temp files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wf-creds-'))
    await new CredentialStore(dir, null).setToken('t')
    expect(readdirSync(dir)).toEqual(['credentials.json'])
  })
})
