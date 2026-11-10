import type { HTMLInputAutoCompleteAttribute, HTMLInputTypeAttribute, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errorKey?: string;
  hintKey?: string;
  readOnly?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  autoComplete?: HTMLInputAutoCompleteAttribute;
  autoCapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  /** Contenido dentro del control, al borde derecho del campo (p. ej. Mostrar/Ocultar). */
  endAdornment?: ReactNode;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  errorKey,
  hintKey,
  readOnly,
  inputMode,
  autoComplete,
  autoCapitalize,
  placeholder,
  type = 'text',
  endAdornment,
}: TextFieldProps) {
  const { t } = useTranslation();
  const hasError = errorKey !== undefined && errorKey !== '';
  const hasHint = hintKey !== undefined && hintKey !== '';
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hasError ? errorId : '', hasHint ? hintId : ''].filter(Boolean).join(' ');

  return (
    <div className={hasError ? 'login-field login-field--error' : 'login-field'}>
      <label className="login-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="login-field__control">
        <input
          className="login-field__input"
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {endAdornment}
      </div>
      {hasHint ? (
        <p className="login-field__hint" id={hintId}>
          {t(hintKey)}
        </p>
      ) : null}
      {hasError ? (
        <p className="login-field__message" id={errorId}>
          {t(errorKey)}
        </p>
      ) : null}
    </div>
  );
}
