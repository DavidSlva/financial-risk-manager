import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

export interface LoginFormProps {
  onSubmit(values: { rut: string; password: string }): void;
  isSubmitting?: boolean;
  formErrorKey?: string;
  fieldErrorKeys?: { rut?: string; password?: string };
  onFieldEdit?(field: 'rut' | 'password'): void;
  /** Al cambiar, limpia la contraseña y la enfoca. */
  resetPasswordSignal?: number;
  /** Al cambiar el nonce, enfoca el campo indicado. */
  focusField?: { field: 'rut' | 'password'; nonce: number };
}

export function LoginForm({
  onSubmit,
  isSubmitting = false,
  formErrorKey,
  fieldErrorKeys,
  onFieldEdit,
  resetPasswordSignal,
  focusField,
}: LoginFormProps) {
  const { t } = useTranslation();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const rutRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const firstSignal = useRef(true);
  const hasFormError = formErrorKey !== undefined && formErrorKey !== '';

  useEffect(() => {
    if (firstSignal.current) {
      firstSignal.current = false;
      return;
    }
    setPassword('');
    passwordRef.current?.focus();
  }, [resetPasswordSignal]);

  useEffect(() => {
    if (!focusField) return;
    (focusField.field === 'rut' ? rutRef : passwordRef).current?.focus();
  }, [focusField?.field, focusField?.nonce]);

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
        inputRef={rutRef}
        onChange={(value) => {
          setRut(value);
          onFieldEdit?.('rut');
        }}
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
        inputRef={passwordRef}
        onChange={(value) => {
          setPassword(value);
          onFieldEdit?.('password');
        }}
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
