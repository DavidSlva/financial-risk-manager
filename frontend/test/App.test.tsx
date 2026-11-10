import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { LoginClient } from '../src/api/login.types.js';
import type { ScoreClient } from '../src/api/score.types.js';
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

  it('login exitoso muestra la pantalla de score con el RUT precargado, solo en memoria y sin tocar la URL', async () => {
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
    expect(await screen.findByRole('heading', { name: 'Consulta tu score' })).toBeTruthy();
    expect((screen.getByLabelText('RUT') as HTMLInputElement).value).toBe('12345678-5');
    expect(screen.queryByRole('heading', { name: 'Sesión iniciada' })).toBeNull();
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
      await screen.findByRole('heading', { name: 'Consulta tu score' });
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

  it('un 401 en la consulta de score descarta la sesión y vuelve al login con aviso', async () => {
    const loginClient = vi
      .fn<LoginClient>()
      .mockResolvedValue({ kind: 'ok', expiresIn: 900, refreshExpiresIn: 86400 });
    const scoreClient = vi.fn<ScoreClient>().mockResolvedValue({
      kind: 'error',
      reason: 'unauthorized',
      status: 401,
      messageKey: 'score.errors.sessionExpired',
    });
    renderApp({ loginClient, scoreClient, now: () => 0 });
    await userEvent.type(screen.getByLabelText('RUT'), '12345678-5');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Secreto-123');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Consulta tu score' });
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Tu sesión expiró. Vuelve a iniciar sesión.',
    );
    expect(scoreClient).toHaveBeenCalledWith('12345678-5', expect.anything());
  });

  it('el temporizador de expiración no supera el máximo de setTimeout (2147483647 ms)', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const loginClient = vi
      .fn<LoginClient>()
      .mockResolvedValue({ kind: 'ok', expiresIn: 10_000_000, refreshExpiresIn: 20_000_000 });
    renderApp({ loginClient, now: () => 0 });
    await userEvent.type(screen.getByLabelText('RUT'), '12345678-5');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Secreto-123');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Consulta tu score' });
    const delays = setTimeoutSpy.mock.calls
      .map((call) => call[1])
      .filter((d): d is number => typeof d === 'number');
    expect(Math.max(...delays)).toBe(2147483647);
    expect(screen.getByRole('heading', { name: 'Consulta tu score' })).toBeTruthy();
  });

  it('la vista previa /dev/login-states sigue funcionando', async () => {
    window.history.replaceState(null, '', '/dev/login-states');
    const { container } = renderApp();
    await waitFor(() =>
      expect(container.querySelectorAll('section[data-state]').length).toBeGreaterThan(0),
    );
  });
});
