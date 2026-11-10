import { useTranslation } from 'react-i18next';
import type { ScoreOutcome } from '../api/score.types.js';
import { formatScoreDate } from '../lib/format-score-date.js';

export interface ScoreResultProps {
  outcome: ScoreOutcome;
}

const FALLBACK_ERROR_KEY = 'score.errors.serverError';

function safeDate(iso: string): string {
  try {
    return formatScoreDate(iso);
  } catch {
    return iso;
  }
}

export function ScoreResult({ outcome }: ScoreResultProps) {
  const { t, i18n } = useTranslation();

  if (outcome.kind === 'ok') {
    return (
      <section className="score-result" role="status">
        <p className="score-result__value">{outcome.score}</p>
        <p className="score-result__rut">{outcome.rut}</p>
        <p className="score-result__date">
          <span className="score-result__date-label">{t('score.date.label')}</span>{' '}
          <time dateTime={outcome.fecha}>{safeDate(outcome.fecha)}</time>
        </p>
      </section>
    );
  }

  const key =
    outcome.messageKey !== '' && i18n.exists(outcome.messageKey)
      ? outcome.messageKey
      : FALLBACK_ERROR_KEY;
  return (
    <p className="score-notice" role="alert">
      {t(key)}
    </p>
  );
}
