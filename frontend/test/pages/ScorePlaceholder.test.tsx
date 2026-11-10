import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../../src/i18n/index.js';
import { ScorePlaceholder } from '../../src/pages/ScorePlaceholder.js';

afterEach(cleanup);

describe('ScorePlaceholder', () => {
  it('muestra el título y el RUT', () => {
    render(
      <I18nextProvider i18n={initI18n()}>
        <ScorePlaceholder rut="12345678-5" />
      </I18nextProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Sesión iniciada' })).toBeTruthy();
    expect(screen.getByText('RUT').parentElement?.textContent).toContain('12345678-5');
  });
});
