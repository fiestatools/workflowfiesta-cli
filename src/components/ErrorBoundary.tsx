import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { themeColors } from '../theme'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback UI to show on error */
  fallback?: ReactNode
  /** Callback when an error is caught */
  onError?: (error: Error, info: { componentStack: string }) => void
  /** Title shown in the error box */
  title?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  componentStack: string
}

/**
 * Error boundary component that catches rendering errors in its children
 * and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, componentStack: '' }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' })
    this.props.onError?.(error, {
      componentStack: info.componentStack ?? '',
    })
  }

  override render() {
    const { hasError, error, componentStack } = this.state
    const { children, fallback, title = 'Error' } = this.props

    if (hasError) {
      if (fallback) {
        return fallback
      }

      const message = error?.message ?? 'An unknown error occurred'
      const stackLines = componentStack
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, 5)

      return (
        <box
          flexDirection="column"
          borderStyle="rounded"
          borderColor={themeColors.error}
          paddingX={1}
          paddingY={1}
          gap={1}
        >
          <text fg={themeColors.error}>
            <b>{title}</b>
          </text>
          <text fg={themeColors.text}>{message}</text>
          {stackLines.length > 0 && (
            <box flexDirection="column">
              <text fg={themeColors.textMuted}>Component stack:</text>
              {stackLines.map((line, idx) => (
                <text key={idx} fg={themeColors.textSubtle}>
                  {line}
                </text>
              ))}
            </box>
          )}
          <text fg={themeColors.textMuted}>
            Press Ctrl+C to exit
          </text>
        </box>
      )
    }

    return children
  }
}
