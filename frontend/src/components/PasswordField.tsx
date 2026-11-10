import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, type TextFieldProps } from './TextField';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'endAdornment'>;

export function PasswordField(props: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="login-password">
      <TextField
        {...props}
        type={visible ? 'text' : 'password'}
        endAdornment={
          <button
            type="button"
            className="login-password-toggle"
            aria-pressed={visible}
            aria-controls={props.id}
            onClick={() => setVisible((current) => !current)}
          >
            {t(visible ? 'login.password.hide' : 'login.password.show')}
          </button>
        }
      />
    </div>
  );
}
