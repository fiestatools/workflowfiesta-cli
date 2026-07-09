import { SyntaxStyle } from '@opentui/core'
import { useMemo } from 'react'

export interface MarkdownTextProps {
  content: string
  streaming?: boolean
}

/** Markdown text renderer for assistant messages. */
export function MarkdownText({ content, streaming = false }: MarkdownTextProps) {
  // Create a simple syntax style (memoized)
  const syntaxStyle = useMemo(() => SyntaxStyle.create(), [])

  return (
    <markdown
      content={content}
      syntaxStyle={syntaxStyle}
      streaming={streaming}
      conceal={true}
    />
  )
}
