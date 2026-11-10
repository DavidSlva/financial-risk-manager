import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import type { LoginClient, LoginFailureReason, LoginOutcome } from '../../src/api/login.types.js';
import { initI18n } from '../../src/i18n/index.js';
import { LoginPage } from '../../src/pages/LoginPage.js';
import type { Session } from '../../src/session/session.types.js';

afterEach(cleanup);

const RUT = '12.345.678-5';
const PASSWORD = 'Secreto-123';
const OK: LoginOutcome = { kind: 'ok', expiresIn: 900, refreshExpiresIn: 86400 };

function failure(reason: LoginFailureReason, messageKey: string, status?: number): LoginOutcome {
  return { kind: 'error', reason, messageKey, status };
}

function renderPage(props: Partial<Parameters<typeof LoginPage>[0]> = {}) {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <LoginPage {...props} />
    </I18nextProvider>,
  );
}

async function fill(rut = RUT, password = PASSWORD) {
  if (rut) await userEvent.type(screen.getByLabelText('RUT'), rut);
  if (password) await userEvent.type(screen.getByLabelText('Contraseña'), password);
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

describe('LoginPage', () => {
  it('envío feliz: una llamada con RUT canónico y Session con expiresAt', async () => {
    const client = vi.fn<LoginClient>().mockResolvedValue(OK);
    const onLoggedIn = vi.fn<(s: Session) => void>();
    renderPage({ client, onLoggedIn, now: () => 1_000 });
    await fill();
    await submit();
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));
    expect(client).toHaveBeenCalledTimes(1);
    expect(client.mock.calls[0]?.[0]).toEqual({ rut: '12345678-5', password: PASSWORD });
    expect(onLoggedIn).toHaveBeenCalledWith({ rut: '12345678-5', expiresAt: 1_000 + 900 * 1000 });
  });

  it('error local de RUT: no hay petición y el foco va al RUT', async () => {
    const client = vi.fn<LoginClient>();
    renderPage({ client });
    await fill('12345678-0', PASSWORD);
    await submit();
    expect(client).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa un RUT válido.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('RUT'));
  });

  it('error local de contraseña enfoca la contraseña', async () => {
    const client = vi.fn<LoginClient>();
    renderPage({ client });
    await fill(RUT, 'corta');
    await submit();
    expect(client).not.toHaveBeenCalled();
    expect(screen.getByText('La contraseña debe tener entre 8 y 128 caracteres.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Contraseña'));
  });

  it.each([
    ['bad-request', 'login.errors.badRequest', 400, 'Revisa los datos ingresados.'],
    [
      'too-many-requests',
      'login.errors.tooManyRequests',
      429,
      'Demasiados intentos. Espera unos minutos e inténtalo otra vez.',
    ],
    [
      'client-error',
      'login.errors.clientError',
      403,
      'No pudimos procesar la solicitud. Revisa los datos e inténtalo de nuevo.',
    ],
    [
      'server-error',
      'login.errors.serverError',
      500,
      'Tenemos un problema de nuestro lado. Inténtalo en unos minutos.',
    ],
    [
      'malformed',
      'login.errors.serverError',
      undefined,
      'Tenemos un problema de nuestro lado. Inténtalo en unos minutos.',
    ],
    ['network', 'login.errors.network', undefined, 'No pudimos conectar. Revisa tu conexión.'],
  ] as const)('%s muestra su mensaje por llave', async (reason, key, status, text) => {
    const client = vi.fn<LoginClient>().mockResolvedValue(failure(reason, key, status));
    renderPage({ client });
    await fill();
    await submit();
    expect((await screen.findByRole('alert')).textContent).toBe(text);
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe(PASSWORD);
  });

  it('401 limpia la contraseña, conserva el RUT y enfoca la contraseña', async () => {
    const client = vi
      .fn<LoginClient>()
      .mockResolvedValue(failure('unauthorized', 'login.errors.invalidCredentials', 401));
    renderPage({ client });
    await fill();
    await submit();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'RUT o contraseña incorrectos',
    );
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('RUT') as HTMLInputElement).value).toBe(RUT);
    expect(document.activeElement).toBe(screen.getByLabelText('Contraseña'));
  });

  it('nunca muestra el texto del servidor', async () => {
    const client = vi.fn<LoginClient>().mockResolvedValue({
      kind: 'error',
      reason: 'server-error',
      messageKey: 'login.errors.serverError',
      status: 500,
      error: 'TEXTO-SECRETO-DEL-SERVIDOR',
    } as LoginOutcome);
    renderPage({ client });
    await fill();
    await submit();
    await screen.findByRole('alert');
    expect(document.body.textContent).not.toContain('TEXTO-SECRETO-DEL-SERVIDOR');
  });

  it('el error de formulario se borra al editar un campo', async () => {
    const client = vi
      .fn<LoginClient>()
      .mockResolvedValue(failure('server-error', 'login.errors.serverError', 500));
    renderPage({ client });
    await fill();
    await submit();
    await screen.findByRole('alert');
    await userEvent.type(screen.getByLabelText('RUT'), '1');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('el error de campo se borra al editar ese campo', async () => {
    renderPage({ client: vi.fn<LoginClient>() });
    await fill('', '');
    await submit();
    expect(screen.getByText('Ingresa un RUT válido.')).toBeTruthy();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('RUT'), '1');
    expect(screen.queryByText('Ingresa un RUT válido.')).toBeNull();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy();
  });

  it('con la petición pendiente muestra isSubmitting y bloquea envíos dobles', async () => {
    let resolve: (o: LoginOutcome) => void = () => {};
    const client = vi.fn<LoginClient>().mockImplementation(
      () =>
        new Promise<LoginOutcome>((r) => {
          resolve = r;
        }),
    );
    renderPage({ client });
    await fill();
    await userEvent.type(screen.getByLabelText('Contraseña'), '{Enter}');
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Contraseña'), '{Enter}');
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(client).toHaveBeenCalledTimes(1);
    await act(async () => resolve(failure('network', 'login.errors.network')));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
  });

  it('desmontar aborta la petición y no llama a onLoggedIn ni actualiza estado', async () => {
    let signal: AbortSignal | undefined;
    let resolve: (o: LoginOutcome) => void = () => {};
    const client = vi.fn<LoginClient>().mockImplementation((_c, options) => {
      signal = options?.signal;
      return new Promise<LoginOutcome>((r) => {
        resolve = r;
      });
    });
    const onLoggedIn = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderPage({ client, onLoggedIn });
    await fill();
    await submit();
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve(OK));
    expect(onLoggedIn).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('un AbortError no se muestra como error', async () => {
    const client = vi
      .fn<LoginClient>()
      .mockRejectedValue(new DOMException('abortado', 'AbortError'));
    renderPage({ client });
    await fill();
    await submit();
    await waitFor(() => expect(client).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('la contraseña no aparece en ningún texto del DOM fuera del campo', async () => {
    const client = vi
      .fn<LoginClient>()
      .mockResolvedValue(failure('server-error', 'login.errors.serverError', 500));
    renderPage({ client });
    await fill();
    await submit();
    await screen.findByRole('alert');
    expect(document.body.textContent).not.toContain(PASSWORD);
  });

  it('noticeKey muestra un role="status"; sin él no hay aviso', () => {
    renderPage({ noticeKey: 'login.notices.sessionExpired' });
    expect(screen.getByRole('status').textContent).toBe(
      'Tu sesión expiró. Vuelve a iniciar sesión.',
    );
    cleanup();
    renderPage();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
