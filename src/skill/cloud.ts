import type { ApiClient } from '../api'

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

  async list(_filter?: { tags?: string[], org?: string }): Promise<CloudSkillMeta[]> {
    throw new Error('Cloud skill listing is not yet available.')
  }

  async sync(): Promise<{ uploaded: string[], downloaded: string[] }> {
    throw new Error('Cloud skill sync is not yet available.')
  }
}
