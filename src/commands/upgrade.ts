import { uninstallCommand as uninstallImpl, upgradeCommand as upgradeImpl } from '../installation'

export interface UpgradeOptions {
  target?: string
  method?: 'curl' | 'brew'
}

export interface UninstallOptions {
  keepData: boolean
  dryRun: boolean
  force: boolean
}

export async function upgrade(options: UpgradeOptions): Promise<void> {
  await upgradeImpl({
    target: options.target,
    forceMethod: options.method,
  })
}

export async function uninstall(options: UninstallOptions): Promise<void> {
  await uninstallImpl({
    keepData: options.keepData,
    dryRun: options.dryRun,
    force: options.force,
  })
}
