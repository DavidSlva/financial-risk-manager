import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { ScoreResult } from '../../src/components/ScoreResult';
import { SCORE_ERROR_KEYS } from '../../src/config/score-errors';
import { formatScoreDate } from '../../src/lib/format-score-date';
import { initI18n } from '../../src/i18n/index';
import type { ScoreFailureReason, ScoreOutcome } from '../../src/api/score.types';

afterEach(cleanup);

function renderResult(outcome: ScoreOutcome) {
  return render(
    <I18nextProvider i18n={initI18n()}>
      <ScoreResult outcome={outcome} />
    </I18nextProvider>,
  );
}

describe('ScoreResult', () => {
  it('éxito: role=status con score, rut tal como llega, etiqueta y fecha formateada', () => {
    const consultedAt = '2025-06-27T14:35:00Z';
    renderResult({ kind: 'ok', rut: '12.345.678-9', score: 73, consultedAt });
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('73');
    expect(status.textContent).toContain('12.345.678-9');
    expect(status.textContent).toContain('Fecha del score');
    expect(status.textContent).toContain(formatScoreDate(consultedAt));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('éxito con fecha inválida no lanza', () => {
    renderResult({ kind: 'ok', rut: '1-9', score: 5, consultedAt: 'ayer' });
    expect(screen.getByRole('status').textContent).toContain('5');
  });

  const reasons = Object.keys(SCORE_ERROR_KEYS) as ScoreFailureReason[];
  for (const reason of reasons) {
    it(`fallo ${reason}: role=alert con su texto`, () => {
      const messageKey = SCORE_ERROR_KEYS[reason];
      renderResult({ kind: 'error', reason, messageKey });
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe(initI18n().t(messageKey));
      expect(screen.queryByRole('status')).toBeNull();
    });
  }

  it('messageKey desconocida o vacía no rompe y muestra el mensaje genérico', () => {
    for (const messageKey of ['score.errors.nope', '']) {
      renderResult({ kind: 'error', reason: 'server-error', messageKey });
      expect(screen.getByRole('alert').textContent).toBe(initI18n().t('score.errors.serverError'));
      cleanup();
    }
  });

  it('el estado HTTP del servidor no aparece en el DOM', () => {
    renderResult({
      kind: 'error',
      reason: 'forbidden',
      status: 403,
      messageKey: 'score.errors.forbidden',
    });
    expect(document.body.textContent).not.toContain('403');
  });
});
