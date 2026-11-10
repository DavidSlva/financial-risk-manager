import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

export interface LoginFormProps {
  onSubmit(values: { rut: string; password: string }): void;
  isSubmitting?: boolean;
  formErrorKey?: string;
  fieldErrorKeys?: { rut?: string; password?: string };
}

export function LoginForm({
  onSubmit,
  isSubmitting = false,
  formErrorKey,
  fieldErrorKeys,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const hasFormError = formErrorKey !== undefined && formErrorKey !== '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    onSubmit({ rut, password });
  }

  return (
    <form className="login-form" noValidate onSubmit={handleSubmit}>
      <TextField
        id="rut"
        label={t('login.rut.label')}
        value={rut}
        onChange={setRut}
        errorKey={fieldErrorKeys?.rut}
        readOnly={isSubmitting}
        inputMode="text"
        autoComplete="username"
        autoCapitalize="off"
        placeholder={t('login.rut.placeholder')}
      />
      <PasswordField
        id="password"
        label={t('login.password.label')}
        value={password}
        onChange={setPassword}
        errorKey={fieldErrorKeys?.password}
        readOnly={isSubmitting}
        autoComplete="current-password"
      />
      {hasFormError ? (
        <p className="login-form__error" role="alert">
          {t(formErrorKey)}
        </p>
      ) : null}
      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? t('login.submitting') : t('login.submit')}
      </Button>
    </form>
  );
}
