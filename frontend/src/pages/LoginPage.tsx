import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loginClient } from '../api/login.client.js';
import type { LoginClient } from '../api/login.types.js';
import { LoginForm } from '../components/LoginForm';
import { validateLogin } from '../lib/validate-login.js';
import type { Session } from '../session/session.types.js';

export interface LoginPageProps {
  client?: LoginClient;
  onLoggedIn?: (session: Session) => void;
  noticeKey?: string;
  now?: () => number;
}

type FieldErrors = { rut?: string; password?: string };

export function LoginPage({
  client = loginClient,
  onLoggedIn,
  noticeKey,
  now = Date.now,
}: LoginPageProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrorKey, setFormErrorKey] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [resetSignal, setResetSignal] = useState(0);
  const [focusField, setFocusField] = useState<
    { field: 'rut' | 'password'; nonce: number } | undefined
  >();
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  async function handleSubmit(values: { rut: string; password: string }) {
    if (busy.current) return;
    setFormErrorKey(undefined);
    const validation = validateLogin(values);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setFocusField((prev) => ({ field: validation.firstInvalid, nonce: (prev?.nonce ?? 0) + 1 }));
      return;
    }
    setFieldErrors({});
    busy.current = true;
    setIsSubmitting(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      const outcome = await client(
        { rut: validation.rut, password: values.password },
        { signal: abort.signal },
      );
      if (!mounted.current || abort.signal.aborted) return;
      if (outcome.kind === 'ok') {
        onLoggedIn?.({ rut: validation.rut, expiresAt: now() + outcome.expiresIn * 1000 });
        return;
      }
      setFormErrorKey(outcome.messageKey);
      if (outcome.reason === 'unauthorized') setResetSignal((n) => n + 1);
    } catch (error) {
      if (!mounted.current || (error instanceof DOMException && error.name === 'AbortError')) {
        return;
      }
      setFormErrorKey('login.errors.network');
    } finally {
      busy.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }

  function handleFieldEdit(field: 'rut' | 'password') {
    setFormErrorKey(undefined);
    setFieldErrors((prev) => (prev[field] === undefined ? prev : { ...prev, [field]: undefined }));
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-card__title">{t('login.title')}</h1>
        <p className="login-card__subtitle">{t('login.subtitle')}</p>
        {noticeKey ? (
          <p className="login-notice" role="status">
            {t(noticeKey)}
          </p>
        ) : null}
        <LoginForm
          onSubmit={(values) => void handleSubmit(values)}
          isSubmitting={isSubmitting}
          formErrorKey={formErrorKey}
          fieldErrorKeys={fieldErrors}
          onFieldEdit={handleFieldEdit}
          resetPasswordSignal={resetSignal}
          focusField={focusField}
        />
      </section>
    </main>
  );
}
