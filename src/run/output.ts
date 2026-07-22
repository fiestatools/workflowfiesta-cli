/* eslint-disable no-console -- CLI output */
import type { RunEvent } from '../runs/runEvents'
import { error, orange, success, warning } from '../theme'

export function isTTY(): boolean {
  return process.stdout.isTTY === true
}

export function printHeader(agentName: string): void {
  if (isTTY()) {
    console.log()
    console.log(orange(`> ${agentName}`))
    console.log()
  }
}

export function printText(text: string): void {
  if (!text.trim()) {
    return
  }

  if (isTTY()) {
    console.log(text.trim())
    console.log()
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
        console.log(warning(`> Tool: ${toolName}`))
      }
      else {
        console.log(`[Tool] ${toolName}`)
      }
      break
    }

    case 'tool_result': {
      const err = stringField(content, 'error')
      if (err) {
        if (isTTY()) {
          console.log(error(`Tool error: ${err}`))
        }
        else {
          console.log(`[Tool Error] ${err}`)
        }
      }
      break
    }

    case 'skill_invoked': {
      const skillName = stringField(content, 'name') ?? 'unknown'
      if (isTTY()) {
        console.log(success(`> Skill: ${skillName}`))
      }
      else {
        console.log(`[Skill] ${skillName}`)
      }
      break
    }

    case 'sub_agent_spawned': {
      const agentName = stringField(content, 'name') ?? 'unknown'
      if (isTTY()) {
        console.log(orange(`> Sub-agent: ${agentName}`))
      }
      else {
        console.log(`[Sub-agent] ${agentName}`)
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
    console.error(error(`Error: ${message}`))
  }
  else {
    console.error(`Error: ${message}`)
  }
}

export function printWarning(message: string): void {
  if (isTTY()) {
    console.error(warning(`! ${message}`))
  }
  else {
    console.error(`Warning: ${message}`)
  }
}

function stringField(content: Record<string, unknown>, key: string): string | undefined {
  const value = content[key]
  return typeof value === 'string' ? value : undefined
}
