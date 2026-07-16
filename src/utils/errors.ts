export function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }
  if (typeof err === 'string') {
    return err
  }
  return String(err)
}

export function formatErrorWithPrefix(prefix: string, err: unknown): string {
  return `${prefix}: ${formatError(err)}`
}
