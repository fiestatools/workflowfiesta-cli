import { z } from 'zod'

export const CommandCategorySchema = z.enum(['chat', 'settings', 'navigation', 'help'])
export type CommandCategory = z.infer<typeof CommandCategorySchema>
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodError
}

export const CommandConfigSchema = z.object({
  name: z.string().min(1).describe('Primary name of the command'),
  alias: z.string().optional().describe('Short alias for the command'),
  description: z.string().describe('Description shown in the command palette'),
  category: CommandCategorySchema.default('chat').describe('Category for grouping'),
  requiresArgs: z.boolean().optional().describe('Whether the command requires arguments'),
  argsPlaceholder: z.string().optional().describe('Placeholder text for arguments'),
})
export type CommandConfig = z.infer<typeof CommandConfigSchema>

export const AgentConfigSchema = z.object({
  id: z.string().min(1).describe('Unique identifier for the agent'),
  name: z.string().min(1).describe('Display name for the agent'),
  description: z.string().optional().describe('Description of what the agent does'),
  enabled: z.boolean().default(true).describe('Whether this agent is enabled'),
  config: z.record(z.unknown()).optional().describe('Custom configuration for the agent'),
})
export type AgentConfig = z.infer<typeof AgentConfigSchema>

export const AutoupdateSchema = z.union([
  z.boolean(),
  z.literal('notify'),
]).describe('Auto-update behavior: true (auto-install patches), false (disabled), or "notify" (only notify)')

export const WorkflowfiestaConfigSchema = z.object({
  apiBaseUrl: z.string().url().optional().describe('Base URL of the WorkflowFiesta backend API'),
  requestTimeoutMs: z.number().positive().int().optional().describe('Timeout in milliseconds for API requests'),
  agentId: z.string().optional().describe('UID of the agent to use'),
  /**
   * Auto-update behavior:
   * - `true` (default): Auto-install patches, notify for minor/major updates
   * - `false`: Disable all auto-update checks
   * - `"notify"`: Only notify about updates, never auto-install
   */
  autoupdate: AutoupdateSchema.optional(),

  installScriptUrl: z.string().url().optional().describe('URL of the install script for curl-based upgrades'),
  agents: z.record(AgentConfigSchema).optional().describe('Custom agent configurations'),
  commands: z.record(CommandConfigSchema).optional().describe('Custom command configurations'),
})

export type WorkflowfiestaConfig = z.infer<typeof WorkflowfiestaConfigSchema>

export const LegacyCliConfigSchema = z.object({
  apiBaseUrl: z.string().optional(),
  requestTimeoutMs: z.number().positive().int().optional(),
  agentId: z.string().optional(),
  autoupdate: AutoupdateSchema.optional(),
  installScriptUrl: z.string().optional(),
})

export type LegacyCliConfig = z.infer<typeof LegacyCliConfigSchema>

export function validateConfig(config: unknown): ValidationResult<WorkflowfiestaConfig> {
  const result = WorkflowfiestaConfigSchema.safeParse(config)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: result.error }
}

export function validateConfigOrThrow(config: unknown, source?: string): WorkflowfiestaConfig {
  const result = validateConfig(config)

  if (!result.success && result.errors) {
    const issues = result.errors.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    const sourceInfo = source ? ` (${source})` : ''
    throw new Error(`Invalid configuration${sourceInfo}:\n${issues}`)
  }

  return result.data!
}

export function formatValidationErrors(errors: z.ZodError): string[] {
  return errors.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  })
}
