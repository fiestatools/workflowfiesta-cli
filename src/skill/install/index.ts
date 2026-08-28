import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import slugify from '@sindresorhus/slugify'
import { loadSkill } from '../loader'
import { cleanupTempDir, cloneRepo } from './git'
import { parseSource } from './source-parser'

export { GitCloneError } from './git'
export { type ParsedSource, parseSource } from './source-parser'

export interface InstallOptions {
  skills?: string[]
  global?: boolean
  list?: boolean
  ref?: string
  force?: boolean
}

export interface DiscoveredSkill {
  name: string
  description: string
  path: string
}

export interface InstallResult {
  installed: string[]
  skipped: Array<{ name: string, reason: string }>
  failed: Array<{ name: string, error: string }>
}

const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '__pycache__']
const MAX_DEPTH = 4

export function toSkillSlug(name: string): string {
  return slugify(name, { lowercase: true }).slice(0, 64).replace(/^-+|-+$/g, '')
}

async function discoverSkillsInDir(dir: string, depth = 0): Promise<DiscoveredSkill[]> {
  if (depth > MAX_DEPTH)
    return []

  const skills: DiscoveredSkill[] = []
  const skillMdPath = join(dir, 'SKILL.md')

  try {
    await stat(skillMdPath)
    const result = await loadSkill(skillMdPath, 'project-agents')
    if (result.ok) {
      skills.push({
        name: result.skill.name,
        description: result.skill.description,
        path: dir,
      })
      return skills
    }
  }
  catch {}

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.includes(entry.name))
        continue
      const subSkills = await discoverSkillsInDir(join(dir, entry.name), depth + 1)
      skills.push(...subSkills)
    }
  }
  catch {}

  return skills
}

export async function installSkills(
  source: string,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const result: InstallResult = {
    installed: [],
    skipped: [],
    failed: [],
  }

  const parsed = parseSource(source)
  let sourceDir: string
  let tempDir: string | null = null

  if (parsed.type === 'local') {
    if (!existsSync(parsed.localPath!)) {
      throw new Error(`Local path does not exist: ${parsed.localPath}`)
    }
    sourceDir = parsed.subpath
      ? join(parsed.localPath!, parsed.subpath)
      : parsed.localPath!
  }
  else {
    const ref = options.ref ?? parsed.ref
    tempDir = await cloneRepo(parsed.url, ref)
    sourceDir = parsed.subpath ? join(tempDir, parsed.subpath) : tempDir
  }

  try {
    const allSkills = await discoverSkillsInDir(sourceDir)

    if (allSkills.length === 0) {
      throw new Error(
        'No valid skills found. Skills require a SKILL.md with name and description in frontmatter.',
      )
    }

    let skills = allSkills
    if (options.skills && options.skills.length > 0) {
      const filterNames = options.skills.map(s => s.toLowerCase())
      skills = allSkills.filter(s =>
        filterNames.includes(s.name.toLowerCase())
        || filterNames.includes(toSkillSlug(s.name)),
      )

      if (skills.length === 0) {
        const available = allSkills.map(s => s.name).join(', ')
        throw new Error(
          `No skills match filter: ${options.skills.join(', ')}\n`
          + `Available: ${available}`,
        )
      }
    }

    if (options.list) {
      return { ...result, installed: skills.map(s => s.name) }
    }

    const targetBase = options.global
      ? join(homedir(), '.agents', 'skills')
      : join(process.cwd(), '.agents', 'skills')

    await mkdir(targetBase, { recursive: true })

    for (const skill of skills) {
      const slug = toSkillSlug(skill.name)
      const destDir = join(targetBase, slug)

      try {
        if (existsSync(destDir) && !options.force) {
          result.skipped.push({
            name: skill.name,
            reason: 'already exists (use --force to overwrite)',
          })
          continue
        }

        if (existsSync(destDir)) {
          await rm(destDir, { recursive: true, force: true })
        }

        await cp(skill.path, destDir, { recursive: true })
        result.installed.push(skill.name)
      }
      catch (err) {
        result.failed.push({
          name: skill.name,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return result
  }
  finally {
    if (tempDir) {
      await cleanupTempDir(tempDir).catch(() => {})
    }
  }
}
