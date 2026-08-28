// Auth commands
export {
  authList,
  authLogin,
  authLogout,
  authRemove,
  authStatus,
  authSwitch,
} from './auth'
export type {
  AuthLoginOptions,
  AuthRemoveOptions,
  AuthSwitchOptions,
} from './auth'

// Config commands
export {
  configGet,
  configList,
  configSet,
} from './config'
export type {
  ConfigGetOptions,
  ConfigSetOptions,
} from './config'

// Run command
export { run } from './run'
export type { RunOptions } from './run'

// Skill commands
export {
  skillCreate,
  skillList,
  skillShow,
  skillSync,
  skillValidate,
} from './skill'
export type {
  SkillCreateOptions,
  SkillShowOptions,
  SkillValidateOptions,
} from './skill'

// Upgrade/uninstall commands
export {
  uninstall,
  upgrade,
} from './upgrade'
export type {
  UninstallOptions,
  UpgradeOptions,
} from './upgrade'
