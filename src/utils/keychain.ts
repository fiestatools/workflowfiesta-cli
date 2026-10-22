import { spawnSync } from 'node:child_process'
import { userInfo } from 'node:os'
import { logger } from '../logger'

export class KeychainError extends Error {}

function keychainError(message: string, status: number | null, stderr: string): KeychainError {
  stderr = stderr.trim()
  logger.error(message, { status, stderr })
  return new KeychainError(`${message}: ${stderr}`)
}

function security(args: string[]) {
  return spawnSync('/usr/bin/security', args, { encoding: 'utf-8' })
}

export function keychainRead(service: string): string | undefined {
  const result = security(['find-generic-password', '-s', service, '-a', userInfo().username, '-w'])
  if (result.status === 44) {
    return undefined // item not found
  }
  if (result.status !== 0) {
    throw keychainError(`Could not read "${service}" from the Keychain`, result.status, result.stderr)
  }
  return result.stdout.replace(/\n$/, '')
}

export function keychainWrite(service: string, value: string): void {
  // Hex (-X) avoids quoting issues. The value is passed as an argument, which
  // macOS shows only to the same user, who can already read the item.
  const hex = Buffer.from(value, 'utf-8').toString('hex')
  const result = security(['add-generic-password', '-U', '-s', service, '-a', userInfo().username, '-X', hex])
  if (result.status !== 0) {
    throw keychainError(`Could not save "${service}" to the Keychain`, result.status, result.stderr)
  }
}

export function keychainDelete(service: string): void {
  const result = security(['delete-generic-password', '-s', service, '-a', userInfo().username])
  if (result.status !== 0 && result.status !== 44) {
    throw keychainError(`Could not delete "${service}" from the Keychain`, result.status, result.stderr)
  }
}
