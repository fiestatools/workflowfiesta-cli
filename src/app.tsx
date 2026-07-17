import type { Services } from './services'
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { useEffect, useState } from 'react'
import { AuthGate, ChatInterface, ErrorBoundary, LoadingScreen } from './components'

type AppView = 'loading' | 'auth' | 'chat'

export interface StartAppOptions {
  continueLastSession?: boolean
}

export function App({ services, continueLastSession }: { services: Services | null, continueLastSession?: boolean }) {
  const [view, setView] = useState<AppView>('loading')

  useEffect(() => {
    if (!services)
      return

    void services.auth.isAuthenticated().then((isAuth) => {
      setView(isAuth ? 'chat' : 'auth')
    })

    return services.auth.onDidChangeAuthentication((change) => {
      const isAuth = change.status === 'signedIn'
      if (!isAuth && view === 'chat') {
        setView('auth')
      }
    })
  }, [services, view])

  if (!services || view === 'loading') {
    return <LoadingScreen message="Loading..." />
  }

  if (view === 'auth') {
    return (
      <AuthGate
        authService={services.auth}
        onAuthenticated={() => setView('chat')}
      />
    )
  }

  return <ChatInterface services={services} continueLastSession={continueLastSession} />
}

export async function startApp(services: Services, options?: StartAppOptions): Promise<void> {
  const renderer = await createCliRenderer()
  const root = createRoot(renderer)
  root.render(
    <ErrorBoundary title="Application Error">
      <App services={services} continueLastSession={options?.continueLastSession} />
    </ErrorBoundary>,
  )
}
