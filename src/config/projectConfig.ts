import type { AgentConfig, CommandConfig, WorkflowfiestaConfig } from './schema'
import { readFileSync } from 'node:fs'
import {
  discoverConfigs,
  findWorkflowfiestaDirectories,
  listConfigSubdirFiles,
} from './discovery'
import { parseJsoncOrThrow } from './jsonc'
import { deepMerge } from './merge'
import { AgentConfigSchema, CommandConfigSchema } from './schema'

export interface ProjectConfigResult {
  config: WorkflowfiestaConfig
  agents: Map<string, AgentConfig>
  commands: Map<string, CommandConfig>
  warnings: string[]
  sourceFiles: string[]
}

/**
 * Load agent configurations from .workflowfiesta/agents/ directories.
 *
 * @param wfDirectories - Array of .workflowfiesta directory paths
 * @param warnings - Array to collect warnings
 * @returns Map of agent ID to agent config
 */
function loadAgentConfigs(
  wfDirectories: string[],
  warnings: string[],
): Map<string, AgentConfig> {
  const agents = new Map<string, AgentConfig>()

  for (const wfDir of wfDirectories) {
    const agentFiles = listConfigSubdirFiles(wfDir, 'agents')

    for (const filePath of agentFiles) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const parsed = parseJsoncOrThrow(content, filePath)
        const result = AgentConfigSchema.safeParse(parsed)

        if (result.success) {
          agents.set(result.data.id, result.data)
        }
        else {
          const issues = result.error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join(', ')
          warnings.push(`Invalid agent config (${filePath}): ${issues}`)
        }
      }
      catch (error) {
        warnings.push(`Failed to load agent config (${filePath}): ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  return agents
}

/**
 * Load command configurations from .workflowfiesta/commands/ directories.
 *
 * @param wfDirectories - Array of .workflowfiesta directory paths
 * @param warnings - Array to collect warnings
 * @returns Map of command name to command config
 */
function loadCommandConfigs(
  wfDirectories: string[],
  warnings: string[],
): Map<string, CommandConfig> {
  const commands = new Map<string, CommandConfig>()

  for (const wfDir of wfDirectories) {
    const commandFiles = listConfigSubdirFiles(wfDir, 'commands')

    for (const filePath of commandFiles) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const parsed = parseJsoncOrThrow(content, filePath)
        const result = CommandConfigSchema.safeParse(parsed)

        if (result.success) {
          commands.set(result.data.name, result.data)
        }
        else {
          const issues = result.error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join(', ')
          warnings.push(`Invalid command config (${filePath}): ${issues}`)
        }
      }
      catch (error) {
        warnings.push(`Failed to load command config (${filePath}): ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  return commands
}

/**
 * Load the complete project configuration.
 * This includes:
 * - Main config from all sources (global, project, directory)
 * - Agent configs from .workflowfiesta/agents/
 * - Command configs from .workflowfiesta/commands/
 *
 * @param startDir - Directory to start discovery from (usually process.cwd())
 * @returns Complete project configuration
 */
export async function loadProjectConfig(startDir: string): Promise<ProjectConfigResult> {
  const warnings: string[] = []
  const sourceFiles: string[] = []

  const discoveryResult = await discoverConfigs(startDir)
  warnings.push(...discoveryResult.warnings)
  sourceFiles.push(...discoveryResult.sources.map(s => s.path))

  const config = discoveryResult.merged

  const wfDirectories = await findWorkflowfiestaDirectories(startDir)

  const agentsFromFiles = loadAgentConfigs(wfDirectories, warnings)

  const agents = new Map(agentsFromFiles)
  if (config.agents) {
    for (const [id, agentConfig] of Object.entries(config.agents)) {
      const existing = agents.get(id)
      if (existing) {
        // Merge existing with config (config takes precedence)
        agents.set(id, deepMerge(existing, agentConfig as Partial<AgentConfig>) as AgentConfig)
      }
      else {
        agents.set(id, agentConfig as AgentConfig)
      }
    }
  }

  const commandsFromFiles = loadCommandConfigs(wfDirectories, warnings)

  // Merge commands from main config into the map (main config takes precedence)
  const commands = new Map(commandsFromFiles)
  if (config.commands) {
    for (const [name, cmdConfig] of Object.entries(config.commands)) {
      const existing = commands.get(name)
      if (existing) {
        commands.set(name, deepMerge(existing, cmdConfig as Partial<CommandConfig>) as CommandConfig)
      }
      else {
        commands.set(name, cmdConfig as CommandConfig)
      }
    }
  }

  return {
    config,
    agents,
    commands,
    warnings,
    sourceFiles,
  }
}

export async function getMergedConfig(startDir: string): Promise<WorkflowfiestaConfig> {
  const result = await loadProjectConfig(startDir)
  return result.config
}
