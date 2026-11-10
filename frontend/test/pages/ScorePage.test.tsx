import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { ScorePage } from '../../src/pages/ScorePage';
import { SCORE_ERROR_KEYS } from '../../src/config/score-errors';
import { initI18n } from '../../src/i18n/index';
import type { ScoreClient, ScoreFailureReason, ScoreOutcome } from '../../src/api/score.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

const t = (key: string) => initI18n().t(key);

const OK: ScoreOutcome = {
  kind: 'ok',
  rut: '12.345.678-9',
  score: 73,
  consultedAt: '2025-06-27T14:35:00Z',
};

function fail(reason: ScoreFailureReason, status?: number): ScoreOutcome {
  return { kind: 'error', reason, status, messageKey: SCORE_ERROR_KEYS[reason] };
}

function renderPage(props: Parameters<typeof ScorePage>[0] = {}) {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <ScorePage {...props} />
    </I18nextProvider>,
  );
}

const input = () => screen.getByLabelText('RUT') as HTMLInputElement;
const submitButton = () => screen.getByRole('button') as HTMLButtonElement;

function deferred() {
  let resolve!: (o: ScoreOutcome) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<ScoreOutcome>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ScorePage', () => {
  it('en reposo muestra título, subtítulo, campo y botón, sin tarjeta', () => {
    renderPage({ client: vi.fn() });
    expect(screen.getByRole('heading', { name: 'Consulta tu score' })).toBeTruthy();
    expect(screen.getByText('Ingresa un RUT para ver su score.')).toBeTruthy();
    expect(submitButton().textContent).toBe('Consultar');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('precarga initialRut', () => {
    renderPage({ client: vi.fn(), initialRut: '12345678-5' });
    expect(input().value).toBe('12345678-5');
  });

  it('RUT inválido: error de campo, aria-invalid y sin llamar al cliente', async () => {
    const client = vi.fn<ScoreClient>();
    renderPage({ client });
    await userEvent.type(input(), '12345678-0');
    await userEvent.click(submitButton());
    expect(client).not.toHaveBeenCalled();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(t('score.errors.invalidRut'))).toBeTruthy();
  });

  it('éxito: llama al cliente con el RUT canónico y muestra la tarjeta', async () => {
    const client = vi.fn<ScoreClient>().mockResolvedValue(OK);
    renderPage({ client });
    await userEvent.type(input(), '12.345.678-5');
    await userEvent.click(submitButton());
    const status = await screen.findByRole('status');
    expect(client).toHaveBeenCalledTimes(1);
    expect(client.mock.calls[0]?.[0]).toBe('12345678-5');
    expect(client.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(status.textContent).toContain('73');
    expect(status.textContent).toContain('12.345.678-9');
  });

  const cases: Array<[ScoreFailureReason, number | undefined]> = [
    ['forbidden', 403],
    ['not-found', 404],
    ['server-error', 500],
    ['network', undefined],
    ['malformed', undefined],
    ['client-error', 418],
  ];
  for (const [reason, status] of cases) {
    it(`${reason}: muestra su mensaje en un aviso`, async () => {
      const client = vi.fn<ScoreClient>().mockResolvedValue(fail(reason, status));
      renderPage({ client, initialRut: '12345678-5' });
      await userEvent.click(submitButton());
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(t(SCORE_ERROR_KEYS[reason]));
      expect(screen.queryByRole('status')).toBeNull();
    });
  }

  it('400 del servidor: error de campo', async () => {
    const client = vi.fn<ScoreClient>().mockResolvedValue(fail('invalid-rut', 400));
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    await waitFor(() => expect(input().getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByText(t('score.errors.invalidRut'))).toBeTruthy();
  });

  it('401: llama onSessionExpired una vez y no pinta datos', async () => {
    const client = vi.fn<ScoreClient>().mockResolvedValue(fail('unauthorized', 401));
    const onSessionExpired = vi.fn();
    renderPage({ client, onSessionExpired, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('401 sin onSessionExpired: muestra el aviso de sesión expirada', async () => {
    const client = vi.fn<ScoreClient>().mockResolvedValue(fail('unauthorized', 401));
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(t('score.errors.sessionExpired'));
  });

  it('una excepción del cliente (no abort) se trata como fallo de red y libera la carga', async () => {
    const client = vi
      .fn<ScoreClient>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(OK);
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(t(SCORE_ERROR_KEYS.network));
    expect(submitButton().disabled).toBe(false);
    expect(input().readOnly).toBe(false);
    await userEvent.click(submitButton());
    expect((await screen.findByRole('status')).textContent).toContain('73');
    expect(client).toHaveBeenCalledTimes(2);
  });

  it('enfoca el campo RUT cuando el RUT local es inválido', async () => {
    renderPage({ client: vi.fn<ScoreClient>() });
    await userEvent.type(input(), '12345678-0');
    submitButton().focus();
    await userEvent.click(submitButton());
    expect(document.activeElement).toBe(input());
  });

  it('enfoca el campo RUT cuando el servidor responde 400', async () => {
    const client = vi.fn<ScoreClient>().mockResolvedValue(fail('invalid-rut', 400));
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    await waitFor(() => expect(document.activeElement).toBe(input()));
  });

  it('recorta los espacios alrededor del RUT antes de consultar', async () => {
    const client = vi.fn<ScoreClient>().mockResolvedValue(OK);
    renderPage({ client });
    await userEvent.type(input(), '  12.345.678-5 ');
    await userEvent.click(submitButton());
    await screen.findByRole('status');
    expect(client.mock.calls[0]?.[0]).toBe('12345678-5');
  });

  it('durante la carga: botón deshabilitado con "Consultando…", campo de solo lectura', async () => {
    const d = deferred();
    const client = vi.fn<ScoreClient>().mockReturnValue(d.promise);
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toBe('Consultando…');
    expect(input().readOnly).toBe(true);
    await act(async () => d.resolve(OK));
    expect(submitButton().disabled).toBe(false);
    expect(input().readOnly).toBe(false);
  });

  it('bloquea el envío doble (Enter y submit directo)', async () => {
    const d = deferred();
    const client = vi.fn<ScoreClient>().mockReturnValue(d.promise);
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    await userEvent.type(input(), '{Enter}');
    fireEvent.submit(input().closest('form') as HTMLFormElement);
    expect(client).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve(OK));
  });

  it('la respuesta tardía de una consulta obsoleta no reemplaza la actual', async () => {
    const a = deferred();
    const b = deferred();
    const client = vi
      .fn<ScoreClient>()
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    const signalA = client.mock.calls[0]?.[1]?.signal as AbortSignal;
    fireEvent.change(input(), { target: { value: '11111111-1' } });
    expect(signalA.aborted).toBe(true);
    await userEvent.click(submitButton());
    expect(client).toHaveBeenCalledTimes(2);
    await act(async () => b.resolve({ ...OK, score: 55 }));
    await act(async () => a.resolve({ ...OK, score: 11 }));
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('55');
    expect(status.textContent).not.toContain('11');
  });

  it('ignora un AbortError de una consulta obsoleta', async () => {
    const a = deferred();
    const client = vi.fn<ScoreClient>().mockReturnValue(a.promise);
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    fireEvent.change(input(), { target: { value: '11111111-1' } });
    await act(async () => a.reject(new DOMException('aborted', 'AbortError')));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('aborta la consulta al desmontar', async () => {
    const d = deferred();
    const client = vi.fn<ScoreClient>().mockReturnValue(d.promise);
    const { unmount } = renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    const signal = client.mock.calls[0]?.[1]?.signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('sin rastro del RUT ni del score en almacenamiento, URL ni consola', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const client = vi.fn<ScoreClient>().mockResolvedValue(fail('forbidden', 403));
    renderPage({ client, initialRut: '12345678-5' });
    await userEvent.click(submitButton());
    await screen.findByRole('alert');
    client.mockResolvedValue(OK);
    await userEvent.click(submitButton());
    await screen.findByRole('status');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain('12345678');
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
