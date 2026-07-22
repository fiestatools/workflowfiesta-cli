import type { AgentRunHandlers } from '../runs/agentRunService'
import type { RunEvent } from '../runs/runEvents'
import type { Services } from '../services'
import type { RunOptions } from './types'
import { ConversationStore } from '../config/conversationStore'
import { logger } from '../logger'
import { readStdin, resolveInput } from './message'
import {
  isTTY,
  printError,
  printHeader,
  printText,
  printToolEvent,
  printWarning,
} from './output'
import { generateTitle, resolveSession, validateFlags } from './session'

export { type RunOptions } from './types'

/**
 * Execute the run command with the given options.
 *
 * @param messageParts - Message parts from CLI arguments (joined with spaces)
 * @param opts - Parsed command options
 * @param services - Initialized application services
 */
export async function runCommand(
  messageParts: string[],
  opts: RunOptions,
  services: Services,
): Promise<void> {
  logger.info('Run command starting', { opts, messagePartsCount: messageParts.length })

  try {
    validateFlags(opts)

    const cliMessage = messageParts.join(' ').trim()
    const pipedInput = await readStdin()
    const message = resolveInput(cliMessage, pipedInput)

    if (!message) {
      printError('You must provide a message.')
      printError('Usage: wf run "your message"')
      printError('       echo "your message" | wf run')
      process.exitCode = 1
      return
    }

    const isAuth = await services.auth.isAuthenticated()
    if (!isAuth) {
      printError('Not signed in. Run: wf auth login --token <your-token>')
      process.exitCode = 1
      return
    }

    const conversationStore = new ConversationStore()
    let session
    try {
      session = await resolveSession(opts, conversationStore, services.runService)
    }
    catch (err) {
      printError(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
      return
    }

    const agentId = session.agentId ?? opts.agent ?? await services.runService.resolveDefaultAgentId()
    if (!agentId) {
      printError('No agent available. Use --agent to specify one.')
      process.exitCode = 1
      return
    }

    logger.info('Starting run', {
      agentId,
      conversationUid: session.uid || '(new)',
      messageLength: message.length,
    })

    const { promise, handlers } = createRunHandlers(agentId)

    const conversationUid = session.uid || undefined
    const run = await services.runService.startRun(
      message,
      conversationUid,
      agentId,
      handlers,
    )

    const title = session.title ?? generateTitle(message)
    conversationStore.upsert({
      uid: run.conversationUid,
      title,
      agentId,
    })

    logger.info('Run started', { conversationUid: run.conversationUid })

    // 9. Handle SIGINT for clean shutdown
    const cleanup = (): void => {
      run.dispose()
      process.exit(130)
    }
    process.on('SIGINT', cleanup)

    // 10. Wait for the run to complete
    await promise

    // 11. Cleanup
    process.off('SIGINT', cleanup)
    run.dispose()
  }
  catch (err) {
    logger.error('Run command error', err)
    printError(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}

function createRunHandlers(
  agentId: string,
): { promise: Promise<void>, handlers: AgentRunHandlers } {
  let headerPrinted = false
  let lastText = ''
  let resolvePromise: () => void

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })

  const handlers: AgentRunHandlers = {
    onAssistantDelta: (fullText: string) => {
      // Track the latest text - we'll print it on completion
      // to avoid garbled output from partial updates
      lastText = fullText
    },

    onToolEvent: (event: RunEvent) => {
      printToolEvent(event)
    },

    onCredentialRequest: () => {
      printWarning('Credential request received but cannot be fulfilled in non-interactive mode.')
    },

    onMcpSetup: () => {
      printWarning('MCP setup request received but cannot be fulfilled in non-interactive mode.')
    },

    onOAuthRequest: () => {
      printWarning('OAuth request received but cannot be fulfilled in non-interactive mode.')
    },

    onAccessTokenReveal: () => {
      // Silently ignore in non-interactive mode
    },

    onCompleted: () => {
      if (lastText) {
        if (!headerPrinted && isTTY()) {
          printHeader(agentId)
          headerPrinted = true
        }
        printText(lastText)
      }
      resolvePromise()
    },

    onError: (message: string) => {
      printError(message)
      process.exitCode = 1
      resolvePromise()
    },

    onConnected: () => {
      logger.debug('WebSocket connected')
    },

    onDisconnected: () => {
      logger.debug('WebSocket disconnected')
    },
  }

  return { promise, handlers }
}
