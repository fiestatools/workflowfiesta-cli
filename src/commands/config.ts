import { log } from '@clack/prompts'
import { getConfigManager } from '../config'

export interface ConfigGetOptions {
  key: string
}

export interface ConfigSetOptions {
  key: string
  value: string
}

export async function configList(): Promise<void> {
  const config = getConfigManager().getConfig()
  log.info(JSON.stringify(config, null, 2))
  process.exit(0)
}

export async function configGet(options: ConfigGetOptions): Promise<void> {
  if (!options.key) {
    log.error('Usage: wf config get <key>')
    process.exit(1)
  }
  const config = getConfigManager().getConfig()
  const value = config[options.key as keyof typeof config]
  if (value !== undefined) {
    log.info(String(value))
  }
  else {
    log.info('(not set)')
  }
  process.exit(0)
}

export async function configSet(options: ConfigSetOptions): Promise<void> {
  if (!options.key || options.value === undefined) {
    log.error('Usage: wf config set <key> <value>')
    process.exit(1)
  }
  getConfigManager().setConfig({ [options.key]: options.value })
  log.success(`Set ${options.key} = ${options.value}`)
  process.exit(0)
}
