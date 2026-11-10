import { lazy, Suspense, useEffect, useState } from 'react';
import { loginClient } from './api/login.client.js';
import type { LoginClient } from './api/login.types.js';
import { LoginPage } from './pages/LoginPage';
import { ScorePlaceholder } from './pages/ScorePlaceholder';
import { resolveScreen } from './resolve-screen';
import type { Session } from './session/session.types.js';

// La vista previa solo existe en desarrollo: Vite elimina esta rama (y el import) del bundle de producción.
const LoginStatesPreview = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/LoginStatesPreview').then((m) => ({ default: m.LoginStatesPreview })),
    )
  : null;

export interface AppProps {
  loginClient?: LoginClient;
  now?: () => number;
}

type AppState = { screen: 'login'; notice?: string } | { screen: 'score'; session: Session };

export function App({ loginClient: client = loginClient, now = Date.now }: AppProps) {
  const [state, setState] = useState<AppState>({ screen: 'login' });
  const expiresAt = state.screen === 'score' ? state.session.expiresAt : undefined;

  // Al expirar el access, la sesión en memoria se descarta y se vuelve al login con aviso.
  useEffect(() => {
    if (expiresAt === undefined) return;
    const timer = setTimeout(
      () => setState({ screen: 'login', notice: 'login.notices.sessionExpired' }),
      Math.max(0, expiresAt - now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt, now]);

  const screen = resolveScreen(window.location.pathname, import.meta.env.DEV);
  if (import.meta.env.DEV && screen === 'login-states' && LoginStatesPreview) {
    return (
      <Suspense fallback={null}>
        <LoginStatesPreview />
      </Suspense>
    );
  }
  if (state.screen === 'score') return <ScorePlaceholder rut={state.session.rut} />;
  return (
    <LoginPage
      client={client}
      now={now}
      noticeKey={state.notice}
      onLoggedIn={(session) => setState({ screen: 'score', session })}
    />
  );
}
