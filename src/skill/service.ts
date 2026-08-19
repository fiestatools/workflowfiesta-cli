import type { Skill, SkillLoadError } from './index'
import type { SkillRegistry } from './registry'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findProjectRoot } from '../config'
import { logger } from '../logger'
import { discoverSkillPaths } from './discovery'
import { loadSkill, loadSkillsFromDir } from './loader'
import { getSkillRegistry } from './registry'

export class SkillService {
  private registry: SkillRegistry
  private loaded = false

  constructor(registry?: SkillRegistry) {
    this.registry = registry ?? getSkillRegistry()
  }

  async loadAll(extraPaths: string[] = []): Promise<{ count: number, errors: SkillLoadError[] }> {
    this.registry.clear()
    const projectRoot = await findProjectRoot(process.cwd()) ?? process.cwd()
    const locations = discoverSkillPaths(projectRoot, extraPaths)

    const allErrors: SkillLoadError[] = []

    for (const loc of locations) {
      const { skills, errors } = await loadSkillsFromDir(loc.dir, loc.source)
      for (const skill of skills) {
        this.registry.register(skill)
      }
      for (const err of errors) {
        this.registry.addError(err)
        allErrors.push(err)
        logger.warn(`Failed to load skill: ${err.path}: ${err.message}`)
      }
    }

    this.loaded = true
    logger.info(`Loaded ${this.registry.size} skills from ${locations.length} locations`)

    return { count: this.registry.size, errors: allErrors }
  }

  getRegistry(): SkillRegistry {
    return this.registry
  }

  get(name: string): Skill | undefined {
    return this.registry.get(name)
  }

  all(): Skill[] {
    return this.registry.all()
  }

  isLoaded(): boolean {
    return this.loaded
  }

  async create(name: string, description: string, targetDir?: string): Promise<string> {
    const projectRoot = await findProjectRoot(process.cwd()) ?? process.cwd()
    const dir = targetDir
      ? join(targetDir, name)
      : join(projectRoot, '.agents', 'skills', name)

    await mkdir(dir, { recursive: true })

    const skillMd = `---
name: ${name}
description: ${description}
version: 0.1.0
tags: []
---

# ${name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')}

## When to Use

- Describe when the agent should load this skill

## Instructions

1. Step one
2. Step two
`

    const filePath = join(dir, 'SKILL.md')
    await writeFile(filePath, skillMd, 'utf-8')
    return dir
  }

  async validate(path: string): Promise<{ valid: boolean, errors: string[] }> {
    const result = await loadSkill(path, 'project-agents')
    if (result.ok) {
      return { valid: true, errors: [] }
    }
    return { valid: false, errors: [result.error.message] }
  }
}

let service: SkillService | null = null

export function getSkillService(): SkillService {
  service ??= new SkillService()
  return service
}

export function resetSkillService(): void {
  service = null
}
