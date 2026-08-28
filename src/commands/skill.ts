import type { Services } from '../services'
import { resolve } from 'node:path'
import { log } from '@clack/prompts'
import color from 'picocolors'
import { getSkillService, GitCloneError, installSkills, SkillCloudClient, toSkillSlug } from '../skill'

export interface SkillShowOptions {
  name: string
}

export interface SkillCreateOptions {
  name: string
  description: string
}

export interface SkillValidateOptions {
  path: string
}

export async function skillList(): Promise<void> {
  const skillService = getSkillService()
  await skillService.loadAll()
  const skills = skillService.all()
  if (skills.length === 0) {
    log.info('No skills found.')
    log.message('Create one with: wf skill create <name>', { symbol: color.cyan('i') })
    log.message('Skills are loaded from .agents/skills/ and .claude/skills/', { symbol: color.cyan('i') })
  }
  else {
    const maxName = Math.max(...skills.map(s => s.name.length))
    const maxSource = Math.max(...skills.map(s => s.source.length))
    for (const skill of skills) {
      const ver = skill.frontmatter.version ? ` v${skill.frontmatter.version}` : ''
      log.message(
        `${skill.name.padEnd(maxName)}  ${skill.source.padEnd(maxSource)}  ${skill.description}${ver}`,
        { symbol: ' ' },
      )
    }
    log.info(`${skills.length} skill(s) found.`)
  }
  process.exit(0)
}

export async function skillShow(options: SkillShowOptions): Promise<void> {
  const skillService = getSkillService()
  await skillService.loadAll()
  const skill = skillService.get(options.name)
  if (!skill) {
    log.error(`Skill "${options.name}" not found.`)
    log.message('Run: wf skill list', { symbol: color.cyan('i') })
    process.exit(1)
  }
  log.info(`Name:        ${skill.name}`)
  log.message(`Description: ${skill.description}`, { symbol: ' ' })
  log.message(`Source:      ${skill.source}`, { symbol: ' ' })
  log.message(`Path:        ${skill.path}`, { symbol: ' ' })
  if (skill.frontmatter.version)
    log.message(`Version:     ${skill.frontmatter.version}`, { symbol: ' ' })
  if (skill.frontmatter.author)
    log.message(`Author:      ${skill.frontmatter.author}`, { symbol: ' ' })
  if (skill.frontmatter.tags?.length)
    log.message(`Tags:        ${skill.frontmatter.tags.join(', ')}`, { symbol: ' ' })
  if (skill.frontmatter.tools?.length)
    log.message(`Tools:       ${skill.frontmatter.tools.join(', ')}`, { symbol: ' ' })
  log.message(`\n--- Content ---\n`, { symbol: ' ' })
  log.message(skill.body, { symbol: ' ' })
  process.exit(0)
}

export async function skillCreate(options: SkillCreateOptions): Promise<void> {
  const skillService = getSkillService()
  const dir = await skillService.create(options.name, options.description)
  log.success(`Created skill "${options.name}" at ${dir}`)
  log.message(`Edit ${dir}/SKILL.md to add instructions.`, { symbol: color.cyan('i') })
  process.exit(0)
}

export async function skillValidate(options: SkillValidateOptions): Promise<void> {
  const skillService = getSkillService()
  const absPath = resolve(options.path)
  const result = await skillService.validate(absPath)
  if (result.valid) {
    log.success(`${absPath} is valid.`)
  }
  else {
    log.error(`${absPath} has errors:`)
    for (const err of result.errors) {
      log.message(`- ${err}`, { symbol: ' ' })
    }
    process.exit(1)
  }
  process.exit(0)
}

export async function skillSync(services: Services): Promise<void> {
  const skillService = getSkillService()
  await skillService.loadAll()
  const localSkills = skillService.all()
  const cloud = new SkillCloudClient(services.api)
  const result = await cloud.sync(localSkills)

  if (result.uploaded.length > 0) {
    log.step(`Uploaded ${result.uploaded.length} skill(s):`)
    for (const name of result.uploaded) {
      log.message(`  ${name}`, { symbol: color.green('^') })
    }
  }
  if (result.downloaded.length > 0) {
    log.step(`Downloaded ${result.downloaded.length} skill(s):`)
    for (const name of result.downloaded) {
      log.message(`  ${name}`, { symbol: color.blue('v') })
    }
  }
  if (result.uploaded.length === 0 && result.downloaded.length === 0) {
    log.success('Skills are in sync. No changes needed.')
  }
  process.exit(0)
}

export interface SkillInstallOptions {
  source: string
  skills?: string[]
  global?: boolean
  list?: boolean
  ref?: string
  force?: boolean
}

export async function skillInstall(options: SkillInstallOptions): Promise<void> {
  try {
    log.step(`Installing skills from ${color.cyan(options.source)}...`)

    const result = await installSkills(options.source, {
      skills: options.skills,
      global: options.global,
      list: options.list,
      ref: options.ref,
      force: options.force,
    })

    // List mode
    if (options.list) {
      if (result.installed.length === 0) {
        log.info('No skills found.')
      }
      else {
        log.step(`Found ${result.installed.length} skill(s):`)
        for (const name of result.installed) {
          log.message(`  ${color.cyan(name)}`, { symbol: ' ' })
        }
      }
      process.exit(0)
    }

    const targetDir = options.global ? '~/.agents/skills/' : '.agents/skills/'

    for (const name of result.installed) {
      log.message(`${color.green('✓')} ${name} → ${targetDir}${toSkillSlug(name)}/`, { symbol: ' ' })
    }

    for (const { name, reason } of result.skipped) {
      log.message(`${color.yellow('⚠')} ${name} - ${reason}`, { symbol: ' ' })
    }

    for (const { name, error } of result.failed) {
      log.message(`${color.red('✗')} ${name} - ${error}`, { symbol: ' ' })
    }

    if (result.installed.length > 0) {
      log.success(`Installed ${result.installed.length} skill(s)`)
    }
    if (result.skipped.length > 0) {
      log.warn(`Skipped ${result.skipped.length} skill(s)`)
    }
    if (result.failed.length > 0) {
      log.error(`Failed ${result.failed.length} skill(s)`)
      process.exit(1)
    }

    process.exit(0)
  }
  catch (err) {
    if (err instanceof GitCloneError) {
      log.error(err.message)
    }
    else {
      log.error(err instanceof Error ? err.message : String(err))
    }
    process.exit(1)
  }
}
