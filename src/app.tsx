import type { Services } from './services'
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { useEffect, useState } from 'react'
import { AuthGate, ChatInterface, ErrorBoundary, LoadingScreen } from './components'
import { printExitSummary } from './utils/exitSummary'

type AppView = 'loading' | 'auth' | 'chat'

export interface StartAppOptions {
  continueLastSession?: boolean
  resumeConversationUid?: string
  terminalTitle?: string
}

export interface AppProps {
  services: Services | null
  continueLastSession?: boolean
  resumeConversationUid?: string
  terminalTitle?: string
}

export function App({ services, continueLastSession, resumeConversationUid, terminalTitle }: AppProps) {
  const [view, setView] = useState<AppView>('loading')

  useEffect(() => {
    if (!services)
      return

    void services.auth.isAuthenticated().then((isAuth) => {
      setView(isAuth ? 'chat' : 'auth')
    })

    return services.auth.onDidChangeAuthentication((change) => {
      const isAuth = change.status === 'signedIn'
      if (isAuth) {
        void services.commandService.reload()
        return
      }
      services.commandService.clear()
      if (view === 'chat') {
        setView('auth')
      }
    })
  }, [services, view])

  useEffect(() => {
    if (!services || view !== 'chat') {
      return
    }
    void services.commandService.sync()
  }, [services, view])

  if (!services || view === 'loading') {
    return <LoadingScreen message="Loading..." />
  }

  if (view === 'auth') {
    return (
      <AuthGate
        authService={services.auth}
        credentialStore={services.credentialStore}
        onAuthenticated={() => setView('chat')}
      />
    )
  }

  return (
    <ChatInterface
      services={services}
      continueLastSession={continueLastSession}
      resumeConversationUid={resumeConversationUid}
      terminalTitle={terminalTitle}
    />
  )
}

export async function startApp(services: Services, options?: StartAppOptions): Promise<void> {
  if (process.stdout.isTTY) {
    process.stdout.write('\x1B[s')
  }

  const renderer = await createCliRenderer({
    onDestroy: () => printExitSummary(services.chatService.getState()),
  })
  const root = createRoot(renderer)
  root.render(
    <ErrorBoundary title="Application Error">
      <App
        services={services}
        continueLastSession={options?.continueLastSession}
        resumeConversationUid={options?.resumeConversationUid}
        terminalTitle={options?.terminalTitle}
      />
    </ErrorBoundary>,
  )
}
