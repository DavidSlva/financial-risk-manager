import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { TextField } from '../../src/components/TextField';
import { initI18n } from '../../src/i18n/index';

afterEach(cleanup);

function renderField(props: Partial<Parameters<typeof TextField>[0]> = {}) {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <TextField id="rut" label="RUT" value="" onChange={() => {}} {...props} />
    </I18nextProvider>,
  );
}

describe('TextField', () => {
  it('asocia etiqueta y campo', () => {
    renderField();
    expect(screen.getByLabelText('RUT').tagName).toBe('INPUT');
  });

  it('con errorKey válido expone aria-invalid, aria-describedby y mensaje', () => {
    renderField({ errorKey: 'login.errors.rutInvalid' });
    const input = screen.getByLabelText('RUT');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const message = document.getElementById(describedBy as string);
    expect(message?.textContent).toBe('Ingresa un RUT válido.');
    expect(input.closest('.login-field')?.classList.contains('login-field--error')).toBe(true);
  });

  it('con errorKey vacío o undefined no hay mensaje ni aria-invalid', () => {
    renderField({ errorKey: '' });
    const input = screen.getByLabelText('RUT');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(document.querySelector('.login-field__message')).toBeNull();
    cleanup();
    renderField();
    expect(screen.getByLabelText('RUT').hasAttribute('aria-invalid')).toBe(false);
    expect(document.querySelector('.login-field__message')).toBeNull();
  });

  it('una clave desconocida muestra la clave sin lanzar', () => {
    renderField({ errorKey: 'login.errors.nope' });
    expect(screen.getByText('login.errors.nope')).toBeTruthy();
  });

  it('con hintKey enlaza aria-describedby a la ayuda', () => {
    renderField({ hintKey: 'login.rut.placeholder' });
    const input = screen.getByLabelText('RUT');
    const hint = document.getElementById(input.getAttribute('aria-describedby') as string);
    expect(hint?.textContent).toBe('12345678-K');
  });

  it('propaga onChange con el valor escrito y soporta readOnly', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <I18nextProvider i18n={initI18n()}>
          <TextField
            id="rut"
            label="RUT"
            value={value}
            onChange={(v) => {
              onChange(v);
              setValue(v);
            }}
          />
        </I18nextProvider>
      );
    }
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('RUT'), 'ab');
    expect(onChange).toHaveBeenLastCalledWith('ab');
    cleanup();
    renderField({ readOnly: true });
    expect((screen.getByLabelText('RUT') as HTMLInputElement).readOnly).toBe(true);
  });
});
