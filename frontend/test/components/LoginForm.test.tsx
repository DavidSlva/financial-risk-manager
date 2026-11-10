import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { LoginForm, type LoginFormProps } from '../../src/components/LoginForm';
import { initI18n } from '../../src/i18n/index';

afterEach(cleanup);

function renderForm(props: Partial<LoginFormProps> = {}) {
  const onSubmit = vi.fn();
  render(
    <I18nextProvider i18n={initI18n()}>
      <LoginForm onSubmit={onSubmit} {...props} />
    </I18nextProvider>,
  );
  return onSubmit;
}

describe('LoginForm', () => {
  it('en reposo muestra placeholders y el botón activo "Continuar"', () => {
    renderForm();
    expect(screen.getByLabelText('RUT').getAttribute('placeholder')).toBe('12345678-K');
    expect(screen.getByLabelText('Contraseña').getAttribute('placeholder')).toBeNull();
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('expone los atributos de autocompletado del RUT y la contraseña', () => {
    renderForm();
    const rut = screen.getByLabelText('RUT');
    expect(rut.getAttribute('autocomplete')).toBe('username');
    expect(rut.getAttribute('inputmode')).toBe('text');
    expect(rut.getAttribute('autocapitalize')).toBe('off');
    expect(screen.getByLabelText('Contraseña').getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });

  it('entrega { rut, password } tal como se escribieron', async () => {
    const onSubmit = renderForm();
    await userEvent.type(screen.getByLabelText('RUT'), ' 12.345.678-k ');
    await userEvent.type(screen.getByLabelText('Contraseña'), ' Secreto 1 ');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ rut: ' 12.345.678-k ', password: ' Secreto 1 ' });
  });

  it('en isSubmitting deshabilita el botón, deja los campos readOnly y Enter no envía', async () => {
    const onSubmit = renderForm({ isSubmitting: true });
    const button = screen.getByRole('button', { name: 'Ingresando…' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    const rut = screen.getByLabelText('RUT') as HTMLInputElement;
    const password = screen.getByLabelText('Contraseña') as HTMLInputElement;
    expect(rut.readOnly).toBe(true);
    expect(password.readOnly).toBe(true);
    await userEvent.click(rut);
    await userEvent.keyboard('{Enter}');
    await userEvent.click(password);
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('el evento submit del formulario no llama a onSubmit mientras isSubmitting', () => {
    const onSubmit = renderForm({ isSubmitting: true });
    const form = document.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('el evento submit del formulario llama a onSubmit cuando no está enviando', () => {
    const onSubmit = renderForm();
    fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledWith({ rut: '', password: '' });
  });

  it('muestra formErrorKey en un elemento role="alert"', () => {
    renderForm({ formErrorKey: 'login.errors.invalidCredentials' });
    expect(screen.getByRole('alert').textContent).toBe(
      'RUT o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.',
    );
  });

  it('sin formErrorKey vacío no hay role="alert"', () => {
    renderForm({ formErrorKey: '' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('con una llave inexistente renderiza sin lanzar', () => {
    expect(() => renderForm({ formErrorKey: 'login.errors.noExiste' })).not.toThrow();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('fieldErrorKeys.rut marca solo el RUT con aria-invalid', () => {
    renderForm({ fieldErrorKeys: { rut: 'login.errors.rutInvalid' } });
    expect(screen.getByLabelText('RUT').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByText('Ingresa un RUT válido.')).toBeTruthy();
  });

  it('el orden de tabulación es RUT, contraseña, Mostrar, Continuar', async () => {
    renderForm();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('RUT'));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Contraseña'));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mostrar' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continuar' }));
  });
});
