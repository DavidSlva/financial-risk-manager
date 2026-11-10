import type { MouseEventHandler, ReactNode } from 'react';

export interface ButtonProps {
  children: ReactNode;
  isLoading?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function Button({
  children,
  isLoading = false,
  type = 'button',
  disabled,
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      className="login-button"
      disabled={disabled || isLoading}
      aria-busy={isLoading ? 'true' : undefined}
      onClick={isLoading ? undefined : onClick}
    >
      {isLoading ? <span className="login-button__spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
