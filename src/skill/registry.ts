import type { Skill, SkillLoadError } from './index'
import { logger } from '../logger'

export class SkillRegistry {
  private skills = new Map<string, Skill>()
  private loadErrors: SkillLoadError[] = []

  register(skill: Skill): void {
    const existing = this.skills.get(skill.name)
    if (existing) {
      logger.warn(`Skill "${skill.name}" from ${skill.source} (${skill.dir}) shadowed by ${existing.source} (${existing.dir})`)
      return
    }
    this.skills.set(skill.name, skill)
  }

  addError(error: SkillLoadError): void {
    this.loadErrors.push(error)
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name)
  }

  all(): Skill[] {
    return Array.from(this.skills.values())
  }

  dirs(): string[] {
    return this.all().map(s => s.dir)
  }

  byTags(tags: string[]): Skill[] {
    const tagSet = new Set(tags.map(t => t.toLowerCase()))
    return this.all().filter(s =>
      s.frontmatter.tags?.some(t => tagSet.has(t.toLowerCase())),
    )
  }

  errors(): readonly SkillLoadError[] {
    return this.loadErrors
  }

  get size(): number {
    return this.skills.size
  }

  clear(): void {
    this.skills.clear()
    this.loadErrors = []
  }
}

let registry: SkillRegistry | null = null

export function getSkillRegistry(): SkillRegistry {
  registry ??= new SkillRegistry()
  return registry
}

export function resetSkillRegistry(): void {
  registry = null
}
