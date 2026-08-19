export { ConversationStore } from './conversationStore'
export type { StoredConversation } from './conversationStore'
export {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAMES,
  discoverConfigs,
  findConfigFile,
  findProjectRoot,
  findWorkflowfiestaDirectories,
  getGlobalConfigDir,
  getGlobalConfigPath,
  getLegacyGlobalConfigDir,
  LEGACY_CONFIG_FILE_NAME,
  listConfigSubdirFiles,
  loadConfigFile,
} from './discovery'
export type { ConfigSource, ConfigSourceType, DiscoveryResult } from './discovery'

export { parseJsonc, parseJsoncOrThrow } from './jsonc'
export type { JsoncParseError, JsoncParseResult } from './jsonc'

export { deepClone, deepMerge, deepMergeAll } from './merge'

export { getMergedConfig, loadProjectConfig } from './projectConfig'
export type { ProjectConfigResult } from './projectConfig'

export {
  AgentConfigSchema,
  AutoupdateSchema,
  CommandCategorySchema,
  CommandConfigSchema,
  formatValidationErrors,
  LegacyCliConfigSchema,
  SkillsCloudConfigSchema,
  SkillsConfigSchema,
  validateConfig,
  validateConfigOrThrow,
  WorkflowfiestaConfigSchema,
} from './schema'
export type {
  AgentConfig,
  CommandCategory,
  CommandConfig,
  LegacyCliConfig,
  SkillsConfig,
  ValidationResult,
  WorkflowfiestaConfig,
} from './schema'

export { ConfigManager, getConfigManager, resetConfigManager } from './settings'
export type { CliConfig } from './settings'
export {
  createGetApiBaseUrl,
  createGetWsBaseUrl,
  getApiBaseUrl,
  getConfiguredAgentId,
  getRequestTimeoutMs,
} from './settings'
