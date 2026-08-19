import type { SkillSource } from './index'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export interface DiscoveryLocation {
  dir: string
  source: SkillSource
  priority: number
}

/**
 * Build the ordered list of skill directories to scan.
 * Priority: project .agents > project .claude > global .agents > global .claude > config extras.
 */
export function discoverSkillPaths(
  projectRoot: string,
  extraPaths: string[] = [],
): DiscoveryLocation[] {
  const home = homedir()
  const locations: DiscoveryLocation[] = [
    { dir: resolve(projectRoot, '.agents', 'skills'), source: 'project-agents', priority: 1 },
    { dir: resolve(projectRoot, '.claude', 'skills'), source: 'project-claude', priority: 2 },
    { dir: join(home, '.agents', 'skills'), source: 'global-agents', priority: 3 },
    { dir: join(home, '.claude', 'skills'), source: 'global-claude', priority: 4 },
  ]

  for (let i = 0; i < extraPaths.length; i++) {
    const p = extraPaths[i]!
    const abs = p.startsWith('~') ? join(home, p.slice(1)) : resolve(projectRoot, p)
    locations.push({ dir: abs, source: 'config-path', priority: 5 + i })
  }

  return locations
}
