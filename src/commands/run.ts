import type { RunOptions } from '../run'
import type { Services } from '../services'
import { runCommand as runImpl } from '../run'

export type { RunOptions }

export async function run(message: string[], options: RunOptions, services: Services): Promise<void> {
  await runImpl(message, options, services)
}
