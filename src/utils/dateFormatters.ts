export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a relative time string (e.g., "3h ago", "just now").
 * Accepts either a Date object or an ISO string.
 */
export function formatRelativeTime(date: Date | string): string {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const now = Date.now()
  const diffMs = now - timestamp
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))

  if (diffSec < 60) {
    return 'just now'
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return `${diffMin}m ago`
  }

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) {
    return `${diffHour}h ago`
  }

  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}d ago`
}
