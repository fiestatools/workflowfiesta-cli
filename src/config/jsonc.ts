import type { ParseError } from 'jsonc-parser'
import { parse, printParseErrorCode } from 'jsonc-parser'

export interface JsoncParseError {
  message: string
  offset: number
  length: number
  line: number
  column: number
}

export interface JsoncParseResult<T> {
  success: boolean
  data?: T
  errors?: JsoncParseError[]
}

function offsetToPosition(content: string, offset: number): { line: number, column: number } {
  const lines = content.slice(0, offset).split('\n')
  const lastLine = lines[lines.length - 1] ?? ''
  return {
    line: lines.length,
    column: lastLine.length + 1,
  }
}

export function parseJsonc<T = unknown>(content: string, filePath?: string): JsoncParseResult<T> {
  const parseErrors: ParseError[] = []

  const data = parse(content, parseErrors, {
    allowTrailingComma: true,
    allowEmptyContent: true,
    disallowComments: false,
  }) as T | undefined

  if (parseErrors.length > 0) {
    const detailedErrors = parseErrors.map((error) => {
      const { line, column } = offsetToPosition(content, error.offset)
      const prefix = filePath ? `${filePath}:${line}:${column}` : `Line ${line}, Column ${column}`
      return {
        message: `${prefix}: ${printParseErrorCode(error.error)}`,
        offset: error.offset,
        length: error.length,
        line,
        column,
      }
    })

    return {
      success: false,
      errors: detailedErrors,
    }
  }

  return {
    success: true,
    data,
  }
}

export function parseJsoncOrThrow<T = unknown>(content: string, filePath?: string): T {
  const result = parseJsonc<T>(content, filePath)

  if (!result.success) {
    const errorMessages = result.errors?.map(e => e.message).join('\n') ?? 'Unknown parse error'
    throw new Error(`Failed to parse JSONC${filePath ? ` (${filePath})` : ''}:\n${errorMessages}`)
  }

  return result.data as T
}
