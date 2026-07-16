import { HOMEBREW_CORE_FORMULA, HOMEBREW_TAP_FORMULA } from './constants'
import { runCommandSimple } from './shell'

export type InstallationMethod = 'curl' | 'brew' | 'unknown'

export interface DetectionResult {
  /** Detected installation method */
  method: InstallationMethod
  /** Path to the executable */
  execPath: string
  /** Homebrew formula name if method is 'brew' */
  brewFormula?: string
}

/**
 * Check if a Homebrew formula is installed by checking `brew list --formula`.
 * Returns the formula name if installed, null otherwise.
 */
async function checkBrewFormula(formula: string): Promise<boolean> {
  const result = await runCommandSimple('brew', ['list', '--formula', formula])
  // brew list outputs the formula name if installed
  return result !== null && result.includes('wf')
}

/**
 * Detect which Homebrew formula is installed.
 * Checks tapped formula first, then core formula.
 */
async function getBrewFormula(): Promise<string | null> {
  // First check if brew command exists
  const brewPath = await runCommandSimple('which', ['brew'])
  if (!brewPath) {
    return null
  }

  // Check tapped formula first (higher priority)
  if (await checkBrewFormula(HOMEBREW_TAP_FORMULA)) {
    return HOMEBREW_TAP_FORMULA
  }

  // Fall back to core formula
  if (await checkBrewFormula(HOMEBREW_CORE_FORMULA)) {
    return HOMEBREW_CORE_FORMULA
  }

  return null
}

function pathSuggestsBrew(execPath: string): boolean {
  const lowerPath = execPath.toLowerCase()
  return (
    lowerPath.includes('homebrew')
    || lowerPath.includes('/usr/local/cellar/')
    || lowerPath.includes('/opt/homebrew/')
    || lowerPath.includes('/home/linuxbrew/')
  )
}

function pathSuggestsCurl(execPath: string): boolean {
  const lowerPath = execPath.toLowerCase()
  return (
    lowerPath.includes('.workflowfiesta/bin')
    || lowerPath.includes('workflowfiesta/bin')
  )
}

/**
 * Detect how WorkflowFiesta CLI was installed.
 *
 * Detection strategy:
 * 1. Check `process.execPath` for path hints (Homebrew paths, .workflowfiesta/bin)
 * 2. If path suggests Homebrew, verify with `brew list`
 * 3. If path suggests curl install (.workflowfiesta/bin), return 'curl'
 * 4. Probe Homebrew as fallback
 * 5. Return 'unknown' if no method can be determined
 */
export async function detectInstallationMethod(): Promise<DetectionResult> {
  const execPath = process.execPath

  if (pathSuggestsBrew(execPath)) {
    const formula = await getBrewFormula()
    if (formula) {
      return { method: 'brew', execPath, brewFormula: formula }
    }
  }

  if (pathSuggestsCurl(execPath)) {
    return { method: 'curl', execPath }
  }

  const formula = await getBrewFormula()
  if (formula) {
    return { method: 'brew', execPath, brewFormula: formula }
  }

  return { method: 'unknown', execPath }
}

export async function method(): Promise<InstallationMethod> {
  const result = await detectInstallationMethod()
  return result.method
}
