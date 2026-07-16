import type { DetectionResult, InstallationMethod } from './detection'
import type { UninstallTargets } from './targets'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import ora from 'ora'
import prompts from 'prompts'
import { muted, warning } from '../theme'
import { UPGRADE_COMMAND_TIMEOUT_MS } from './constants'
import { detectInstallationMethod } from './detection'
import { UninstallFailedError } from './errors'
import { getUninstallTargets, getWorkflowfiestaDir, SHELL_CONFIG_PATTERNS } from './targets'

export interface UninstallOptions {
  /** Keep conversation data (conversations.json) */
  keepData: boolean
  /** Show what would be removed without actually removing */
  dryRun: boolean
  /** Skip confirmation prompt */
  force: boolean
}

export interface UninstallResult {
  /** Whether the uninstall was successful */
  success: boolean
  /** The installation method that was detected */
  method: InstallationMethod
  /** Paths that were removed */
  removedPaths: string[]
  /** Paths that were skipped (e.g., due to --keep-data) */
  skippedPaths: string[]
  /** Shell config files that were cleaned */
  cleanedShellConfigs: string[]
  /** Manual steps the user needs to take (for curl installs) */
  manualSteps: string[]
}

/**
 * Execute a shell command and return the result.
 */
async function execCommand(
  command: string,
  args: string[],
): Promise<{ stdout: string, stderr: string, exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('error', (error) => {
      resolve({ stdout, stderr: error.message, exitCode: 1 })
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })

    // Timeout
    setTimeout(() => {
      proc.kill()
      resolve({ stdout, stderr: 'Command timed out', exitCode: 124 })
    }, UPGRADE_COMMAND_TIMEOUT_MS)
  })
}

/**
 * Clean workflowfiesta PATH entries from a shell config file.
 */
function cleanShellConfig(
  configPath: string,
  dryRun: boolean,
): { cleaned: boolean, linesRemoved: number } {
  if (!existsSync(configPath)) {
    return { cleaned: false, linesRemoved: 0 }
  }

  const content = readFileSync(configPath, 'utf-8')
  const lines = content.split('\n')
  const filteredLines: string[] = []
  let linesRemoved = 0

  for (const line of lines) {
    const shouldRemove = SHELL_CONFIG_PATTERNS.some(pattern => pattern.test(line))
    if (shouldRemove) {
      linesRemoved++
    }
    else {
      filteredLines.push(line)
    }
  }

  if (linesRemoved === 0) {
    return { cleaned: false, linesRemoved: 0 }
  }

  // Remove consecutive empty lines that might be left behind
  const cleanedLines: string[] = []
  let prevWasEmpty = false
  for (const line of filteredLines) {
    const isEmpty = line.trim() === ''
    if (isEmpty && prevWasEmpty) {
      continue // Skip consecutive empty lines
    }
    cleanedLines.push(line)
    prevWasEmpty = isEmpty
  }

  if (!dryRun) {
    writeFileSync(configPath, cleanedLines.join('\n'))
  }

  return { cleaned: true, linesRemoved }
}

/**
 * Remove the config directory, optionally keeping the data file.
 */
function removeConfigDir(
  configDir: string,
  dataFile: string,
  keepData: boolean,
  dryRun: boolean,
): { removed: string[], skipped: string[] } {
  const removed: string[] = []
  const skipped: string[] = []

  if (!existsSync(configDir)) {
    return { removed, skipped }
  }

  if (keepData && existsSync(dataFile)) {
    // Remove everything except the data file
    const files = readdirSync(configDir)
    for (const file of files) {
      const filePath = `${configDir}/${file}`
      if (filePath === dataFile) {
        skipped.push(filePath)
        continue
      }
      if (!dryRun) {
        rmSync(filePath, { recursive: true, force: true })
      }
      removed.push(filePath)
    }

    // Check if the directory is now empty (except for data file)
    const remainingFiles = dryRun ? files.filter(f => `${configDir}/${f}` === dataFile) : readdirSync(configDir)
    if (remainingFiles.length === 0) {
      if (!dryRun) {
        rmSync(configDir, { recursive: true, force: true })
      }
      removed.push(configDir)
    }
  }
  else {
    // Remove the entire directory
    if (!dryRun) {
      rmSync(configDir, { recursive: true, force: true })
    }
    removed.push(configDir)
  }

  return { removed, skipped }
}

/**
 * Run the brew uninstall command.
 */
async function uninstallBrew(detection: DetectionResult): Promise<void> {
  const formula = detection.brewFormula || 'wf'
  const result = await execCommand('brew', ['uninstall', formula])

  if (result.exitCode !== 0) {
    // Check if it's already uninstalled
    if (result.stderr.includes('No such keg') || result.stderr.includes('is not installed')) {
      return // Already uninstalled, that's fine
    }
    throw new UninstallFailedError('brew', result.stderr || result.stdout, result.exitCode)
  }
}

/**
 * Print the removal summary before executing using ora.
 */
function printSummary(
  targets: UninstallTargets,
  options: UninstallOptions,
  method: InstallationMethod,
  spinner: ReturnType<typeof ora>,
): void {
  const prefix = options.dryRun ? `${muted('[Dry Run]')} ` : ''

  spinner.info(`${prefix}The following will be removed:`)

  // Config directory
  if (existsSync(targets.configDir)) {
    if (options.keepData) {
      spinner.info(`  ${muted('*')} Configuration: ${targets.configDir} ${muted('(excluding conversations.json)')}`)
    }
    else {
      spinner.info(`  ${muted('*')} Configuration: ${targets.configDir}`)
    }
  }

  // Shell configs
  const shellConfigsWithEntries = targets.shellConfigs.filter((config) => {
    if (!existsSync(config.path))
      return false
    const content = readFileSync(config.path, 'utf-8')
    return SHELL_CONFIG_PATTERNS.some(pattern => pattern.test(content))
  })

  if (shellConfigsWithEntries.length > 0) {
    const paths = shellConfigsWithEntries.map(c => c.path.replace(process.env.HOME || '', '~')).join(', ')
    spinner.info(`  ${muted('*')} Shell configs: PATH entries from ${paths}`)
  }

  // Kept items
  if (options.keepData && existsSync(targets.dataFile)) {
    spinner.info(`${prefix}The following will be kept:`)
    spinner.info(`  ${muted('*')} Data: ${targets.dataFile}`)
  }

  // Manual steps for curl installs
  if ((method === 'curl' || method === 'unknown') && targets.binaryPath) {
    spinner.warn(`${prefix}Manual removal required:`)
    spinner.info(`  ${muted('*')} Binary: ${targets.binaryPath}`)
    spinner.info(`  ${muted('*')} Directory: ${getWorkflowfiestaDir()}`)
  }
}

/**
 * Print the final manual steps and thank you message using ora.
 */
function printFinalMessage(
  manualSteps: string[],
  spinner: ReturnType<typeof ora>,
): void {
  if (manualSteps.length > 0) {
    spinner.info('To complete the uninstallation, run:')
    for (const step of manualSteps) {
      spinner.info(`  ${step}`)
    }
  }

  spinner.info(muted('Thank you for using WorkflowFiesta!'))
}

/**
 * Prompt the user for confirmation.
 * Returns true if confirmed, false if cancelled.
 */
async function promptConfirmation(): Promise<boolean> {
  const response = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Are you sure you want to uninstall WorkflowFiesta CLI?',
    initial: false,
  })

  // Handle Ctrl+C or other cancellation
  if (response.confirm === undefined) {
    return false
  }

  return response.confirm
}

/**
 * Main uninstall function.
 */
export async function uninstall(options: UninstallOptions): Promise<UninstallResult> {
  const { keepData, dryRun, force } = options

  // Create spinner instance for logging
  const spinner = ora()

  // Step 1: Confirmation (unless --force or --dry-run)
  if (!force && !dryRun) {
    const confirmed = await promptConfirmation()
    if (!confirmed) {
      spinner.warn(warning('Uninstall cancelled.'))
      return {
        success: false,
        method: 'unknown',
        removedPaths: [],
        skippedPaths: [],
        cleanedShellConfigs: [],
        manualSteps: [],
      }
    }
  }

  // Step 2: Detect installation method
  const detection = await detectInstallationMethod()
  const method = detection.method === 'unknown' ? 'curl' : detection.method

  // Step 3: Get uninstall targets
  const targets = getUninstallTargets(method, detection.execPath)

  // Step 4: Show summary
  printSummary(targets, options, method, spinner)

  // If dry run, stop here
  if (dryRun) {
    spinner.info(muted('No changes were made.'))
    return {
      success: true,
      method,
      removedPaths: [],
      skippedPaths: [],
      cleanedShellConfigs: [],
      manualSteps: getManualSteps(targets, method),
    }
  }

  // Step 5: Execute uninstall
  spinner.start('Uninstalling WorkflowFiesta CLI...')

  const removedPaths: string[] = []
  const skippedPaths: string[] = []
  const cleanedShellConfigs: string[] = []

  try {
    // For brew: run the uninstall command first
    if (method === 'brew') {
      spinner.text = 'Running brew uninstall...'
      await uninstallBrew(detection)
    }

    // Clean shell configs (for both brew and curl)
    spinner.text = 'Cleaning shell configurations...'
    for (const config of targets.shellConfigs) {
      const result = cleanShellConfig(config.path, false)
      if (result.cleaned) {
        cleanedShellConfigs.push(config.path)
      }
    }

    // Remove config directory (for both brew and curl - brew doesn't touch this)
    spinner.text = 'Removing configuration files...'
    const configResult = removeConfigDir(targets.configDir, targets.dataFile, keepData, false)
    removedPaths.push(...configResult.removed)
    skippedPaths.push(...configResult.skipped)

    spinner.succeed('Uninstalled successfully')
  }
  catch (error) {
    spinner.fail('Uninstall failed')
    throw error
  }

  // Step 6: Print final message
  const manualSteps = getManualSteps(targets, method)
  printFinalMessage(manualSteps, spinner)

  return {
    success: true,
    method,
    removedPaths,
    skippedPaths,
    cleanedShellConfigs,
    manualSteps,
  }
}

/**
 * Get manual steps for curl installs.
 */
function getManualSteps(targets: UninstallTargets, method: InstallationMethod): string[] {
  if (method !== 'curl' && method !== 'unknown') {
    return []
  }

  const steps: string[] = []
  const wfDir = getWorkflowfiestaDir()

  if (targets.binaryPath && existsSync(targets.binaryPath)) {
    steps.push(`rm ${targets.binaryPath}`)
  }

  if (existsSync(wfDir)) {
    steps.push(`rm -rf ${wfDir}`)
  }
  else if (targets.binaryDir && existsSync(targets.binaryDir)) {
    // If the wfDir doesn't exist but binaryDir does, suggest removing parent
    const parentDir = dirname(targets.binaryDir)
    if (parentDir.includes('.workflowfiesta')) {
      steps.push(`rm -rf ${parentDir}`)
    }
  }

  return steps
}

/**
 * CLI command handler for `wf uninstall`.
 */
export async function uninstallCommand(options: {
  keepData: boolean
  dryRun: boolean
  force: boolean
}): Promise<void> {
  try {
    const result = await uninstall(options)

    if (!result.success) {
      process.exit(0) // User cancelled, not an error
    }

    process.exit(0)
  }
  catch (error) {
    const spinner = ora()
    if (error instanceof UninstallFailedError) {
      spinner.fail(`Uninstall failed: ${error.message}`)
    }
    else {
      spinner.fail(`Uninstall failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    process.exit(1)
  }
}
