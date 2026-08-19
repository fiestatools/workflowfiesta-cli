import type { Skill, SkillFrontmatter, SkillLoadError, SkillSource } from './index'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import matter from 'gray-matter'
import { SkillFrontmatterSchema } from './index'

// Other coding agents like Claude Code allow invalid YAML in their
// frontmatter. We fall back to a more permissive sanitization for those cases.
function fallbackSanitization(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match)
    return content

  const frontmatter = match[1]!
  const lines = frontmatter.split(/\r?\n/)
  const result: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('#') || line.trim() === '') {
      result.push(line)
      continue
    }

    if (/^\s+/.test(line)) {
      result.push(line)
      continue
    }

    const kvMatch = line.match(/^([a-z_]\w*):\s?(.*)$/i)
    if (!kvMatch) {
      result.push(line)
      continue
    }

    const key = kvMatch[1]
    const value = kvMatch[2]!.trim()

    if (value === '' || value === '>' || value === '|' || value.startsWith('"') || value.startsWith('\'')) {
      result.push(line)
      continue
    }

    if (value.includes(':')) {
      result.push(`${key}: |-`)
      result.push(`  ${value}`)
      continue
    }

    result.push(line)
  }

  const processed = result.join('\n')
  return content.replace(frontmatter, () => processed)
}

export function parseFrontmatter(content: string): { data: Record<string, unknown>, body: string } | { error: string } {
  try {
    const md = matter(content)
    return { data: md.data as Record<string, unknown>, body: md.content.trim() }
  }
  catch {
    try {
      const md = matter(fallbackSanitization(content))
      return { data: md.data as Record<string, unknown>, body: md.content.trim() }
    }
    catch (err) {
      return { error: `Failed to parse frontmatter YAML: ${err instanceof Error ? err.message : String(err)}` }
    }
  }
}

export async function loadSkill(
  skillMdPath: string,
  source: SkillSource,
): Promise<{ ok: true, skill: Skill } | { ok: false, error: SkillLoadError }> {
  const absPath = resolve(skillMdPath)
  const dir = dirname(absPath)
  const dirName = basename(dir)

  let content: string
  try {
    content = await readFile(absPath, 'utf-8')
  }
  catch (err) {
    return { ok: false, error: { path: absPath, message: `Cannot read file: ${err instanceof Error ? err.message : String(err)}` } }
  }

  const parsed = parseFrontmatter(content)
  if ('error' in parsed) {
    return { ok: false, error: { path: absPath, message: parsed.error } }
  }

  const raw = { ...parsed.data }
  if (!raw.name) {
    raw.name = dirName
  }
  if (!raw.description && parsed.body) {
    const firstLine = parsed.body.split('\n').find(l => l.trim() && !l.startsWith('#'))
    if (firstLine) {
      raw.description = firstLine.trim().slice(0, 200)
    }
  }

  const result = SkillFrontmatterSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { ok: false, error: { path: absPath, message: `Invalid frontmatter: ${issues}` } }
  }

  const frontmatter: SkillFrontmatter = result.data

  return {
    ok: true,
    skill: {
      name: frontmatter.name,
      description: frontmatter.description,
      body: parsed.body,
      path: absPath,
      dir,
      source,
      frontmatter,
    },
  }
}

export async function loadSkillsFromDir(
  rootDir: string,
  source: SkillSource,
): Promise<{ skills: Skill[], errors: SkillLoadError[] }> {
  const skills: Skill[] = []
  const errors: SkillLoadError[] = []

  try {
    await stat(rootDir)
  }
  catch {
    return { skills, errors }
  }

  const entries = await readdir(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.'))
      continue
    const skillMd = join(rootDir, entry.name, 'SKILL.md')
    try {
      await stat(skillMd)
    }
    catch {
      continue
    }
    const result = await loadSkill(skillMd, source)
    if (result.ok) {
      skills.push(result.skill)
    }
    else {
      errors.push(result.error)
    }
  }

  return { skills, errors }
}
