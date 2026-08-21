import type { ApiClient } from '../api'
import type { Skill } from './index'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import slugify from '@sindresorhus/slugify'
import { logger } from '../logger'

export interface CloudSkillMeta {
  name: string
  description: string
  version: string
  author: string | null
  tags: string[]
  files: string[]
  checksum: string
  publishedAt: string
  downloads: number
  org: string | null
}

export interface PublishOpts {
  org?: string
  version?: string
}

export interface RemoteSkill {
  uid: string
  orgUid: string
  name: string
  description: string | null
  type: 'llm_prompt' | 'script'
  content: string
  tags: string[]
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncSkillsResponse {
  created: RemoteSkill[]
  updated: RemoteSkill[]
  unchanged: string[]
  remoteOnly: RemoteSkill[]
}

export interface SyncResult {
  uploaded: string[]
  downloaded: string[]
}

function toSkillName(raw: string): string {
  return slugify(raw, { lowercase: true }).slice(0, 64).replace(/^-+|-+$/g, '')
}

/** Wrap a string in double quotes if it contains YAML-special characters. */
function yamlQuote(value: string): string {
  if (/[:#{}[\]|>!&*?,'"\\`@%]/.test(value) || value.startsWith('-') || value.startsWith(' ')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return value
}

export class SkillCloudClient {
  constructor(private api: ApiClient) {}

  async publish(_skillDir: string, _opts?: PublishOpts): Promise<CloudSkillMeta> {
    throw new Error('Cloud skill publishing is not yet available.')
  }

  async install(_name: string, _version?: string, _targetDir?: string): Promise<string> {
    throw new Error('Cloud skill install is not yet available.')
  }

  async search(_query: string): Promise<CloudSkillMeta[]> {
    throw new Error('Cloud skill search is not yet available.')
  }

  /** List all skills for the current org from the backend. */
  async list(_filter?: { tags?: string[], org?: string }): Promise<RemoteSkill[]> {
    return this.api.get<RemoteSkill[]>('/external/skills')
  }

  /**
   * Sync local skills with the backend.
   *
   * 1. Loads all local skills from the registry.
   * 2. Pushes them to the backend via `POST /external/skills/sync`.
   * 3. Downloads any remote-only skills (on the server but not locally)
   *    into `~/.agents/skills/`.
   */
  async sync(localSkills: Skill[]): Promise<SyncResult> {
    const uploaded: string[] = []
    const downloaded: string[] = []

    if (localSkills.length === 0) {
      logger.info('No local skills to sync')
    }

    // Push local skills to backend
    if (localSkills.length > 0) {
      const payload = localSkills.map(skill => ({
        name: skill.name,
        description: skill.description,
        type: 'llm_prompt' as const,
        content: skill.body,
        tags: skill.frontmatter.tags ?? [],
      }))

      const result = await this.api.post<SyncSkillsResponse>('/external/skills/sync', {
        skills: payload,
      })

      for (const s of result.created) uploaded.push(s.name)
      for (const s of result.updated) uploaded.push(s.name)

      for (const remote of result.remoteOnly) {
        try {
          await this.writeRemoteSkill(remote)
          downloaded.push(remote.name)
        }
        catch (err) {
          logger.warn(`Failed to download skill "${remote.name}": ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      logger.info('Skill sync completed', {
        created: result.created.length,
        updated: result.updated.length,
        unchanged: result.unchanged.length,
        downloaded: downloaded.length,
      })
    }
    else {
      // No local skills, still fetch remote ones
      const remoteSkills = await this.list()
      for (const remote of remoteSkills) {
        try {
          await this.writeRemoteSkill(remote)
          downloaded.push(remote.name)
        }
        catch (err) {
          logger.warn(`Failed to download skill "${remote.name}": ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    return { uploaded, downloaded }
  }

  private async writeRemoteSkill(remote: RemoteSkill): Promise<void> {
    const globalSkillsDir = join(homedir(), '.agents', 'skills')
    const name = toSkillName(remote.name)
    const skillDir = join(globalSkillsDir, name)
    await mkdir(skillDir, { recursive: true })

    const tags = remote.tags.length > 0
      ? `\ntags:\n${remote.tags.map(t => `  - ${t}`).join('\n')}`
      : ''

    const description = remote.description ?? name

    const frontmatter = [
      '---',
      `name: ${name}`,
      `description: ${yamlQuote(description)}`,
      ...tags ? [tags.trimStart()] : [],
      '---',
    ].join('\n')

    const content = `${frontmatter}\n\n${remote.content}\n`
    await writeFile(join(skillDir, 'SKILL.md'), content, 'utf-8')
  }
}
