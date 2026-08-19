import { z } from 'zod'

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
})

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>

export type SkillSource
  = | 'project-agents'
    | 'project-claude'
    | 'global-agents'
    | 'global-claude'
    | 'config-path'
    | 'cloud'

export interface Skill {
  name: string
  description: string
  body: string
  path: string
  dir: string
  source: SkillSource
  frontmatter: SkillFrontmatter
}

export interface SkillLoadError {
  path: string
  message: string
}

export type { CloudSkillMeta, PublishOpts } from './cloud'
export { discoverSkillPaths, type DiscoveryLocation } from './discovery'
export { loadSkill, parseFrontmatter } from './loader'
export { getSkillRegistry, resetSkillRegistry, SkillRegistry } from './registry'
export { getSkillService, resetSkillService, SkillService } from './service'
