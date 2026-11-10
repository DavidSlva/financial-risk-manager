import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { LoginStatesPreview } from '../../src/pages/LoginStatesPreview';
import { initI18n } from '../../src/i18n/index';

afterEach(cleanup);

const STATES = [
  'idle',
  'focus',
  'field-error',
  'form-error',
  'submitting',
  'password-visible',
  'long-text',
] as const;

function renderPreview() {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <LoginStatesPreview />
    </I18nextProvider>,
  );
}

function section(container: HTMLElement, name: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`section[data-state="${name}"]`);
  if (!el) throw new Error(`falta la sección ${name}`);
  return el;
}

describe('LoginStatesPreview', () => {
  it('renderiza una sección por estado, cada una con título', () => {
    const { container } = renderPreview();
    const names = Array.from(container.querySelectorAll('section[data-state]')).map((s) =>
      s.getAttribute('data-state'),
    );
    expect(names).toEqual([...STATES]);
    for (const name of STATES) {
      expect(section(container, name).querySelector('h2')?.textContent).toBeTruthy();
    }
  });

  it('form-error muestra el texto de credenciales inválidas', () => {
    const { container } = renderPreview();
    expect(section(container, 'form-error').textContent).toContain(
      'RUT o contraseña incorrectos. Revisa tus datos; si ya lo intentaste varias veces, tu cuenta puede estar bloqueada.',
    );
  });

  it('field-error muestra errores en ambos campos', () => {
    const { container } = renderPreview();
    expect(
      section(container, 'field-error').querySelectorAll('[aria-invalid="true"]'),
    ).toHaveLength(2);
  });

  it('submitting deshabilita el botón y deja los campos en solo lectura', () => {
    const { container } = renderPreview();
    const s = section(container, 'submitting');
    const submit = s.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(true);
    const inputs = s.querySelectorAll<HTMLInputElement>('input');
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input.readOnly).toBe(true);
  });

  it('focus enfoca el campo de RUT', async () => {
    const { container } = renderPreview();
    const rut = section(container, 'focus').querySelector<HTMLInputElement>('input[type="text"]');
    await waitFor(() => expect(document.activeElement).toBe(rut));
  });

  it('password-visible termina con la contraseña visible y el toggle Ocultar', async () => {
    const { container } = renderPreview();
    const s = section(container, 'password-visible');
    await waitFor(() => {
      const inputs = s.querySelectorAll('input');
      expect(inputs[1]?.getAttribute('type')).toBe('text');
    });
    const toggle = s.querySelector('.login-password-toggle');
    expect(toggle?.textContent).toBe('Ocultar');
  });

  it('long-text deja 500 caracteres en ambos campos', async () => {
    const { container } = renderPreview();
    const s = section(container, 'long-text');
    await waitFor(() => {
      const inputs = s.querySelectorAll<HTMLInputElement>('input');
      expect(inputs).toHaveLength(2);
      for (const input of inputs) expect(input.value).toHaveLength(500);
    });
  });
});
