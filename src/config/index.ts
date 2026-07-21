// Conversation storage
export { ConversationStore } from './conversationStore'
export type { StoredConversation } from './conversationStore'

// Config discovery
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

// JSONC parsing
export { parseJsonc, parseJsoncOrThrow } from './jsonc'
export type { JsoncParseError, JsoncParseResult } from './jsonc'

// Deep merge utility
export { deepClone, deepMerge, deepMergeAll } from './merge'

// Project config loading
export { getMergedConfig, loadProjectConfig } from './projectConfig'
export type { ProjectConfigResult } from './projectConfig'

// Schema and validation
export {
  AgentConfigSchema,
  AutoupdateSchema,
  CommandCategorySchema,
  CommandConfigSchema,
  formatValidationErrors,
  LegacyCliConfigSchema,
  validateConfig,
  validateConfigOrThrow,
  WorkflowfiestaConfigSchema,
} from './schema'
export type {
  AgentConfig,
  CommandCategory,
  CommandConfig,
  LegacyCliConfig,
  ValidationResult,
  WorkflowfiestaConfig,
} from './schema'

// Main config manager
export { ConfigManager, getConfigManager, resetConfigManager } from './settings'
export type { CliConfig } from './settings'
export {
  createGetApiBaseUrl,
  createGetWsBaseUrl,
  getApiBaseUrl,
  getConfiguredAgentId,
  getRequestTimeoutMs,
} from './settings'
