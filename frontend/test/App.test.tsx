import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { LoginClient } from '../src/api/login.types.js';
import { App } from '../src/App.js';
import { initI18n } from '../src/i18n/index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

function renderApp(props: Parameters<typeof App>[0] = {}) {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <App {...props} />
    </I18nextProvider>,
  );
}

describe('App', () => {
  it('muestra el login al inicio', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
  });

  it('login exitoso muestra el marcador con el RUT, solo en memoria y sin tocar la URL', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const pushState = vi.spyOn(window.history, 'pushState');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const before = window.location.href;
    const loginClient = vi
      .fn<LoginClient>()
      .mockResolvedValue({ kind: 'ok', expiresIn: 900, refreshExpiresIn: 86400 });
    renderApp({ loginClient, now: () => 0 });
    await userEvent.type(screen.getByLabelText('RUT'), '12.345.678-5');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Secreto-123');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { name: 'Sesión iniciada' })).toBeTruthy();
    expect(document.body.textContent).toContain('12345678-5');
    expect(document.body.textContent).not.toContain('Secreto-123');
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
  });

  it('al expirar la sesión vuelve al login con el aviso sessionExpired', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const loginClient = vi
        .fn<LoginClient>()
        .mockResolvedValue({ kind: 'ok', expiresIn: 900, refreshExpiresIn: 86400 });
      let clock = 0;
      renderApp({ loginClient, now: () => clock });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.type(screen.getByLabelText('RUT'), '12345678-5');
      await user.type(screen.getByLabelText('Contraseña'), 'Secreto-123');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await screen.findByRole('heading', { name: 'Sesión iniciada' });
      clock = 900_000;
      await act(async () => {
        vi.advanceTimersByTime(900_000);
      });
      expect(screen.getByRole('status').textContent).toBe(
        'Tu sesión expiró. Vuelve a iniciar sesión.',
      );
      expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('la vista previa /dev/login-states sigue funcionando', async () => {
    window.history.replaceState(null, '', '/dev/login-states');
    const { container } = renderApp();
    await waitFor(() =>
      expect(container.querySelectorAll('section[data-state]').length).toBeGreaterThan(0),
    );
  });
});
