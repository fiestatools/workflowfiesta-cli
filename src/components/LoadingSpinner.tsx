import { useAnimation } from '../hooks/useAnimation'
import { themeColors } from '../theme'

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

/** Animated loading spinner component. */
export function LoadingSpinner() {
  const frame = useAnimation({ intervalMs: 80 })

  return (
    <text fg={themeColors.primary}>
      {spinnerFrames[frame % spinnerFrames.length]}
      {' '}
    </text>
  )
}
