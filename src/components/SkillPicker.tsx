import type { Skill } from '../skill'
import { useMemo } from 'react'
import { SearchableOverlay } from './SearchableOverlay'

export interface SkillPickerProps {
  skills: Skill[]
  onSelect: (skillName: string) => void
  onClose: () => void
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'project-agents': return '.agents'
    case 'project-claude': return '.claude'
    case 'global-agents': return '~/.agents'
    case 'global-claude': return '~/.claude'
    case 'config-path': return 'config'
    case 'cloud': return 'cloud'
    default: return source
  }
}

export function SkillPicker({ skills, onSelect, onClose }: SkillPickerProps) {
  const items = useMemo(() => skills.map(skill => ({
    key: skill.name,
    label: skill.name,
    description: skill.description,
    badge: [sourceLabel(skill.source), skill.frontmatter.version ? `v${skill.frontmatter.version}` : '']
      .filter(Boolean)
      .join(' · ') || undefined,
  })), [skills])

  return (
    <SearchableOverlay
      title="Skills"
      placeholder="Search skills..."
      items={items}
      onSelect={(name) => {
        onSelect(name)
        onClose()
      }}
      onClose={onClose}
      emptyMessage="No skills found. Create one with: wf skill create <name>"
      noMatchMessage="No matching skills."
      footer={(filtered, total) => `${filtered} of ${total} skill(s)`}
    />
  )
}
