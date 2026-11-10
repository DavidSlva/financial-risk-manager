import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { Button } from '../../src/components/Button';
import { initI18n } from '../../src/i18n/index';

afterEach(cleanup);

function renderButton(props: Partial<Parameters<typeof Button>[0]> = {}) {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <Button {...props}>Continuar</Button>
    </I18nextProvider>,
  );
}

describe('Button', () => {
  it('dispara onClick y es type=button por defecto', async () => {
    const onClick = vi.fn();
    renderButton({ onClick });
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button.getAttribute('type')).toBe('button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('con isLoading queda deshabilitado, expone aria-busy y no dispara onClick', async () => {
    const onClick = vi.fn();
    renderButton({ onClick, isLoading: true });
    const button = screen.getByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sin isLoading no expone aria-busy', () => {
    renderButton();
    expect(screen.getByRole('button').hasAttribute('aria-busy')).toBe(false);
  });

  it('disabled deshabilita el botón', () => {
    renderButton({ disabled: true });
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
