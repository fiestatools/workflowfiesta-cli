import type { RunEvent } from '../runs/runEvents'
import { log } from '@clack/prompts'
import color from 'picocolors'

export function isTTY(): boolean {
  return process.stdout.isTTY === true
}

export function printHeader(agentName: string): void {
  if (isTTY()) {
    log.message(`> ${agentName}`, { symbol: color.magenta('>') })
  }
}

export function printText(text: string): void {
  if (!text.trim()) {
    return
  }

  if (isTTY()) {
    log.message(text.trim(), { symbol: ' ' })
  }
  else {
    process.stdout.write(text)
    if (!text.endsWith('\n')) {
      process.stdout.write('\n')
    }
  }
}

export function printToolEvent(event: RunEvent): void {
  const { eventType, content } = event

  switch (eventType) {
    case 'tool_call': {
      const toolName = stringField(content, 'name') ?? 'unknown'
      if (isTTY()) {
        log.warn(`Tool: ${toolName}`)
      }
      else {
        process.stdout.write(`[Tool] ${toolName}\n`)
      }
      break
    }

    case 'tool_result': {
      const err = stringField(content, 'error')
      if (err) {
        if (isTTY()) {
          log.error(`Tool error: ${err}`)
        }
        else {
          process.stdout.write(`[Tool Error] ${err}\n`)
        }
      }
      break
    }

    case 'skill_invoked': {
      const skillName = stringField(content, 'name') ?? 'unknown'
      if (isTTY()) {
        log.success(`Skill: ${skillName}`)
      }
      else {
        process.stdout.write(`[Skill] ${skillName}\n`)
      }
      break
    }

    case 'sub_agent_spawned': {
      const agentName = stringField(content, 'name') ?? 'unknown'
      if (isTTY()) {
        log.message(`Sub-agent: ${agentName}`, { symbol: color.magenta('>') })
      }
      else {
        process.stdout.write(`[Sub-agent] ${agentName}\n`)
      }
      break
    }

    // Ignore other event types
    default:
      break
  }
}

export function printError(message: string): void {
  if (isTTY()) {
    log.error(`Error: ${message}`)
  }
  else {
    process.stderr.write(`Error: ${message}\n`)
  }
}

export function printWarning(message: string): void {
  if (isTTY()) {
    log.warn(message)
  }
  else {
    process.stderr.write(`Warning: ${message}\n`)
  }
}

function stringField(content: Record<string, unknown>, key: string): string | undefined {
  const value = content[key]
  return typeof value === 'string' ? value : undefined
}
