export type Screen = 'login' | 'login-states';

const LOGIN_STATES_PATH = '/dev/login-states';

/** Elige la pantalla según la ruta. La vista previa de estados solo existe en desarrollo. */
export function resolveScreen(pathname: string, isDev: boolean): Screen {
  return isDev && pathname === LOGIN_STATES_PATH ? 'login-states' : 'login';
}
