import { lazy, Suspense, useEffect, useState } from 'react';
import { loginClient } from './api/login.client.js';
import { fetchScore } from './api/score.client.js';
import type { LoginClient } from './api/login.types.js';
import type { ScoreClient } from './api/score.types.js';
import { LoginPage } from './pages/LoginPage';
import { ScorePage } from './pages/ScorePage';
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
  scoreClient?: ScoreClient;
  now?: () => number;
}

type AppState = { screen: 'login'; notice?: string } | { screen: 'score'; session: Session };

/** Máximo retardo que admite `setTimeout` (entero de 32 bits con signo). */
const MAX_TIMER_DELAY_MS = 2147483647;
const SESSION_EXPIRED_NOTICE = 'login.notices.sessionExpired';

export function App({
  loginClient: client = loginClient,
  scoreClient = fetchScore,
  now = Date.now,
}: AppProps) {
  const [state, setState] = useState<AppState>({ screen: 'login' });
  const expiresAt = state.screen === 'score' ? state.session.expiresAt : undefined;

  // Al expirar el access, la sesión en memoria se descarta y se vuelve al login con aviso.
  useEffect(() => {
    if (expiresAt === undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const remaining = Math.max(0, expiresAt - now());
      timer = setTimeout(
        () => {
          if (expiresAt - now() > 0) arm();
          else setState({ screen: 'login', notice: SESSION_EXPIRED_NOTICE });
        },
        Math.min(remaining, MAX_TIMER_DELAY_MS),
      );
    };
    arm();
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
  if (state.screen === 'score') {
    return (
      <ScorePage
        client={scoreClient}
        initialRut={state.session.rut}
        onSessionExpired={() => setState({ screen: 'login', notice: SESSION_EXPIRED_NOTICE })}
      />
    );
  }
  return (
    <LoginPage
      client={client}
      now={now}
      noticeKey={state.notice}
      onLoggedIn={(session) => setState({ screen: 'score', session })}
    />
  );
}
