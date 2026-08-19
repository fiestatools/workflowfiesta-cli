import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'bun:test'
import { discoverSkillPaths } from '../src/skill/discovery'
import { loadSkill, parseFrontmatter } from '../src/skill/loader'
import { SkillRegistry } from '../src/skill/registry'

describe('parseFrontmatter', () => {
  it('extracts frontmatter and body', () => {
    const content = `---
name: my-skill
description: A test skill
---

# My Skill

Instructions here.`
    const result = parseFrontmatter(content)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.data.name).toBe('my-skill')
      expect(result.data.description).toBe('A test skill')
      expect(result.body).toContain('# My Skill')
    }
  })

  it('handles missing frontmatter', () => {
    const result = parseFrontmatter('# Just a heading\n\nSome content')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.data).toEqual({})
      expect(result.body).toContain('# Just a heading')
    }
  })

  it('parses tags array', () => {
    const content = `---
name: test
description: desc
tags: [react, testing]
---
body`
    const result = parseFrontmatter(content)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.data.tags).toEqual(['react', 'testing'])
    }
  })

  it('handles invalid YAML with colons via fallback sanitization', () => {
    const content = `---
name: test
description: Build things with React: a guide
---
body`
    const result = parseFrontmatter(content)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.data.name).toBe('test')
      expect(result.data.description).toContain('React')
    }
  })
})

describe('loadSkill', () => {
  let tmpDir: string

  afterEach(async () => {
    if (tmpDir)
      await rm(tmpDir, { recursive: true, force: true })
  })

  it('loads a valid skill', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skill-test-'))
    const skillDir = join(tmpDir, 'my-skill')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), `---
name: my-skill
description: A test skill
version: 1.0.0
tags: [testing]
---

# My Skill

Do the thing.
`)
    const result = await loadSkill(join(skillDir, 'SKILL.md'), 'project-agents')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.skill.name).toBe('my-skill')
      expect(result.skill.description).toBe('A test skill')
      expect(result.skill.frontmatter.version).toBe('1.0.0')
      expect(result.skill.frontmatter.tags).toEqual(['testing'])
      expect(result.skill.body).toContain('# My Skill')
    }
  })

  it('derives name from directory when not in frontmatter', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skill-test-'))
    const skillDir = join(tmpDir, 'auto-named')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), `---
description: Auto-named skill
---

Instructions.
`)
    const result = await loadSkill(join(skillDir, 'SKILL.md'), 'project-agents')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.skill.name).toBe('auto-named')
    }
  })

  it('returns error for missing file', async () => {
    const result = await loadSkill('/nonexistent/SKILL.md', 'project-agents')
    expect(result.ok).toBe(false)
  })

  it('returns error for missing required fields', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skill-test-'))
    const skillDir = join(tmpDir, 'bad-skill')
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), `---
version: 1.0.0
---
`)
    const result = await loadSkill(join(skillDir, 'SKILL.md'), 'project-agents')
    // Should fail because description is required and body is empty
    expect(result.ok).toBe(false)
  })
})

describe('SkillRegistry', () => {
  it('registers and retrieves skills', () => {
    const reg = new SkillRegistry()
    const skill = {
      name: 'test',
      description: 'Test skill',
      body: 'body',
      path: '/a/SKILL.md',
      dir: '/a',
      source: 'project-agents' as const,
      frontmatter: { name: 'test', description: 'Test skill' },
    }
    reg.register(skill)
    expect(reg.get('test')).toBe(skill)
    expect(reg.all()).toHaveLength(1)
  })

  it('first registration wins (dedup by name)', () => {
    const reg = new SkillRegistry()
    const skill1 = {
      name: 'test',
      description: 'First',
      body: '',
      path: '/a/SKILL.md',
      dir: '/a',
      source: 'project-agents' as const,
      frontmatter: { name: 'test', description: 'First' },
    }
    const skill2 = {
      name: 'test',
      description: 'Second',
      body: '',
      path: '/b/SKILL.md',
      dir: '/b',
      source: 'global-agents' as const,
      frontmatter: { name: 'test', description: 'Second' },
    }
    reg.register(skill1)
    reg.register(skill2)
    expect(reg.get('test')?.description).toBe('First')
    expect(reg.all()).toHaveLength(1)
  })

  it('filters by tags', () => {
    const reg = new SkillRegistry()
    reg.register({
      name: 'a',
      description: 'A',
      body: '',
      path: '/a/SKILL.md',
      dir: '/a',
      source: 'project-agents',
      frontmatter: { name: 'a', description: 'A', tags: ['react'] },
    })
    reg.register({
      name: 'b',
      description: 'B',
      body: '',
      path: '/b/SKILL.md',
      dir: '/b',
      source: 'project-agents',
      frontmatter: { name: 'b', description: 'B', tags: ['python'] },
    })
    expect(reg.byTags(['react'])).toHaveLength(1)
    expect(reg.byTags(['react'])[0]!.name).toBe('a')
  })
})

describe('discoverSkillPaths', () => {
  it('returns standard locations in priority order', () => {
    const locs = discoverSkillPaths('/project')
    expect(locs[0]!.source).toBe('project-agents')
    expect(locs[1]!.source).toBe('project-claude')
    expect(locs[2]!.source).toBe('global-agents')
    expect(locs[3]!.source).toBe('global-claude')
    expect(locs[0]!.priority).toBeLessThan(locs[1]!.priority)
  })

  it('appends extra paths', () => {
    const locs = discoverSkillPaths('/project', ['./custom-skills'])
    expect(locs).toHaveLength(5)
    expect(locs[4]!.source).toBe('config-path')
    expect(locs[4]!.dir).toContain('custom-skills')
  })
})
