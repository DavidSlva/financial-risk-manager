import { lazy, Suspense } from 'react';
import { LoginPage } from './pages/LoginPage';
import { resolveScreen } from './resolve-screen';

// La vista previa solo existe en desarrollo: Vite elimina esta rama (y el import) del bundle de producción.
const LoginStatesPreview = import.meta.env.DEV
  ? lazy(() =>
      import('./pages/LoginStatesPreview').then((m) => ({ default: m.LoginStatesPreview })),
    )
  : null;

export function App() {
  const screen = resolveScreen(window.location.pathname, import.meta.env.DEV);
  if (import.meta.env.DEV && screen === 'login-states' && LoginStatesPreview) {
    return (
      <Suspense fallback={null}>
        <LoginStatesPreview />
      </Suspense>
    );
  }
  return <LoginPage />;
}
