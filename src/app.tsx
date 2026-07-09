import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { useState, useEffect } from 'react';
import type { Services } from './services';
import { LoadingScreen, ChatInterface, AuthGate } from './components';

type AppView = 'loading' | 'auth' | 'chat';

export function App({ services }: { services: Services | null }) {
  const [view, setView] = useState<AppView>('loading');

  useEffect(() => {
    if (!services) return;

    void services.auth.isAuthenticated().then((isAuth) => {
      setView(isAuth ? 'chat' : 'auth');
    });

    return services.auth.onDidChangeAuthentication((change) => {
      const isAuth = change.status === 'signedIn';
      if (!isAuth && view === 'chat') {
        setView('auth');
      }
    });
  }, [services, view]);

  if (!services || view === 'loading') {
    return <LoadingScreen message="Loading..." />;
  }

  if (view === 'auth') {
    return (
      <AuthGate
        authService={services.auth}
        onAuthenticated={() => setView('chat')}
      />
    );
  }

  return <ChatInterface services={services} />;
}

export async function startApp(services: Services): Promise<void> {
  const renderer = await createCliRenderer();
  const root = createRoot(renderer);
  root.render(<App services={services} />);
}
