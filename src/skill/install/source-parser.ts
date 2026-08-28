import { isAbsolute, resolve } from 'node:path'

export interface ParsedSource {
  type: 'local' | 'github'
  url: string
  localPath?: string
  ref?: string
  subpath?: string
}

function isLocalPath(input: string): boolean {
  return (
    isAbsolute(input)
    || input.startsWith('./')
    || input.startsWith('../')
    || input === '.'
    || input === '..'
  )
}

const patterns = {
  githubTree: /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?$/,
  githubUrl: /^https?:\/\/github\.com\/([^/]+)\/([^/.]+)/,
  shorthand: /^([^/]+)\/([^/]+)(?:\/(.+))?$/,
}

type SourceHandler = (input: string, ref?: string) => ParsedSource | null

const sourceHandlers: SourceHandler[] = [
  (input, ref) => {
    const match = input.match(patterns.githubTree)
    if (!match)
      return null
    const [, owner, repo, branch, subpath] = match
    return {
      type: 'github',
      url: `https://github.com/${owner}/${repo}.git`,
      ref: ref ?? branch,
      subpath,
    }
  },

  (input, ref) => {
    const match = input.match(patterns.githubUrl)
    if (!match)
      return null
    const [, owner, repo] = match
    return {
      type: 'github',
      url: `https://github.com/${owner}/${repo}.git`,
      ref,
    }
  },

  (input, ref) => {
    const match = input.match(patterns.shorthand)
    if (!match)
      return null
    const [, owner, repo, subpath] = match
    return {
      type: 'github',
      url: `https://github.com/${owner}/${repo}.git`,
      ref,
      subpath,
    }
  },
]

export function parseSource(input: string): ParsedSource {
  if (isLocalPath(input)) {
    const resolvedPath = resolve(input)
    return {
      type: 'local',
      url: resolvedPath,
      localPath: resolvedPath,
    }
  }

  let ref: string | undefined
  const hashIndex = input.indexOf('#')
  if (hashIndex > 0) {
    ref = input.slice(hashIndex + 1)
    input = input.slice(0, hashIndex)
  }

  for (const handler of sourceHandlers) {
    const result = handler(input, ref)
    if (result)
      return result
  }

  return {
    type: 'github',
    url: input,
    ref,
  }
}
