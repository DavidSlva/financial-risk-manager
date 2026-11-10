import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { PasswordField } from '../../src/components/PasswordField';
import { initI18n } from '../../src/i18n/index';

afterEach(cleanup);

function renderField() {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <PasswordField id="password" label="Contraseña" value="secreto" onChange={() => {}} />
    </I18nextProvider>,
  );
}

describe('PasswordField', () => {
  it('parte en type=password y alterna con el botón Mostrar/Ocultar', async () => {
    renderField();
    const input = screen.getByLabelText('Contraseña');
    expect(input.getAttribute('type')).toBe('password');
    const show = screen.getByRole('button', { name: 'Mostrar' });
    expect(show.getAttribute('type')).toBe('button');
    expect(show.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(show);
    expect(input.getAttribute('type')).toBe('text');
    const hide = screen.getByRole('button', { name: 'Ocultar' });
    expect(hide.getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(hide);
    expect(input.getAttribute('type')).toBe('password');
    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeTruthy();
  });

  it('el botón queda después del campo en el orden de tabulación', async () => {
    renderField();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Contraseña'));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mostrar' }));
  });
});
