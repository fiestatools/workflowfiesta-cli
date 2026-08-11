const ARGS_PLACEHOLDER = /\{\{\s*args\s*\}\}/gi

/**
 * Build the text a custom command seeds into the input. A template may place
 * the typed arguments with `{{args}}`; otherwise they are appended.
 */
export function renderPromptTemplate(template: string | undefined, args: string): string | undefined {
  const trimmedArgs = args.trim()
  const trimmedTemplate = template?.trim()

  if (!trimmedTemplate) {
    return trimmedArgs || undefined
  }

  if (ARGS_PLACEHOLDER.test(trimmedTemplate)) {
    ARGS_PLACEHOLDER.lastIndex = 0
    return trimmedTemplate.replace(ARGS_PLACEHOLDER, trimmedArgs)
  }

  return trimmedArgs ? `${trimmedTemplate}\n\n${trimmedArgs}` : trimmedTemplate
}
