import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchScore } from '../api/score.client.js';
import type { ScoreClient, ScoreOutcome } from '../api/score.types.js';
import { Button } from '../components/Button';
import { ScoreResult } from '../components/ScoreResult';
import { TextField } from '../components/TextField';
import { normalizeRut } from '../lib/rut.js';

export interface ScorePageProps {
  client?: ScoreClient;
  initialRut?: string;
  onSessionExpired?: () => void;
}

const INVALID_RUT_KEY = 'score.errors.invalidRut';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function ScorePage({
  client = fetchScore,
  initialRut = '',
  onSessionExpired,
}: ScorePageProps) {
  const { t } = useTranslation();
  const [rut, setRut] = useState(initialRut);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<ScoreOutcome | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  function cancelPending(): void {
    controllerRef.current?.abort();
    controllerRef.current = null;
    inFlightRef.current = false;
    setIsLoading(false);
  }

  function handleChange(value: string): void {
    if (inFlightRef.current) cancelPending();
    setRut(value);
    setFieldError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (inFlightRef.current) return;
    const canonical = normalizeRut(rut);
    if (canonical === null) {
      setOutcome(undefined);
      setFieldError(INVALID_RUT_KEY);
      return;
    }
    setFieldError(undefined);
    setOutcome(undefined);
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current = true;
    setIsLoading(true);
    let result: ScoreOutcome;
    try {
      result = await client(canonical, { signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      throw error;
    }
    if (controller.signal.aborted || controllerRef.current !== controller) return;
    controllerRef.current = null;
    inFlightRef.current = false;
    setIsLoading(false);
    if (result.kind === 'error' && result.reason === 'invalid-rut') {
      setFieldError(INVALID_RUT_KEY);
      return;
    }
    if (result.kind === 'error' && result.reason === 'unauthorized') {
      onSessionExpired?.();
      return;
    }
    setOutcome(result);
  }

  return (
    <main className="login-page">
      <section className="login-card score-page">
        <h1 className="login-card__title">{t('score.title')}</h1>
        <p className="login-card__subtitle">{t('score.subtitle')}</p>
        <form className="login-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
          <TextField
            id="score-rut"
            label={t('score.rut.label')}
            value={rut}
            onChange={handleChange}
            errorKey={fieldError}
            readOnly={isLoading}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
          />
          <Button type="submit" isLoading={isLoading}>
            {isLoading ? t('score.submitting') : t('score.submit')}
          </Button>
        </form>
        {outcome ? <ScoreResult outcome={outcome} /> : null}
      </section>
    </main>
  );
}
