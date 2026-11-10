import { useEffect, useRef, type ReactNode } from 'react';
import { LoginForm } from '../components/LoginForm';

/**
 * Vista previa de estados del login. Herramienta solo de desarrollo: App la carga
 * con import() dentro de una rama import.meta.env.DEV, así que no entra al bundle de producción.
 * Los títulos son etiquetas de desarrollo (no texto de producción).
 */
const DEV_TITLES = {
  idle: 'Reposo',
  focus: 'Foco',
  'field-error': 'Error de campo',
  'form-error': 'Error de formulario',
  submitting: 'Enviando',
  'password-visible': 'Contraseña visible',
  'long-text': 'Texto largo',
} as const;

type StateName = keyof typeof DEV_TITLES;

const LONG_VALUE_LENGTH = 500;

/** Asigna un valor a un input de React: usa el setter nativo y dispara el evento input. */
function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const noop = (): void => {};

interface PreviewStateProps {
  name: StateName;
  /** Efecto solo de la vista previa, ejecutado una vez tras montar. */
  setup?: (root: HTMLElement) => void;
  children: ReactNode;
}

function PreviewState({ name, setup, children }: PreviewStateProps) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && setup) setup(ref.current);
  }, []);
  return (
    <section ref={ref} data-state={name} className="login-preview__state login-card">
      <h2>{DEV_TITLES[name]}</h2>
      {children}
    </section>
  );
}

function focusRut(root: HTMLElement): void {
  root.querySelector<HTMLInputElement>('input')?.focus();
}

function showPassword(root: HTMLElement): void {
  const toggle = root.querySelector<HTMLButtonElement>('.login-password-toggle');
  if (toggle && toggle.getAttribute('aria-pressed') !== 'true') toggle.click();
}

function fillLongText(root: HTMLElement): void {
  const value = 'a'.repeat(LONG_VALUE_LENGTH);
  for (const input of root.querySelectorAll<HTMLInputElement>('input')) setInputValue(input, value);
}

export function LoginStatesPreview() {
  return (
    <main className="login-preview">
      <PreviewState name="idle">
        <LoginForm onSubmit={noop} />
      </PreviewState>
      <PreviewState name="focus" setup={focusRut}>
        <LoginForm onSubmit={noop} />
      </PreviewState>
      <PreviewState name="field-error">
        <LoginForm
          onSubmit={noop}
          fieldErrorKeys={{
            rut: 'login.errors.rutInvalid',
            password: 'login.errors.passwordInvalid',
          }}
        />
      </PreviewState>
      <PreviewState name="form-error">
        <LoginForm onSubmit={noop} formErrorKey="login.errors.invalidCredentials" />
      </PreviewState>
      <PreviewState name="submitting">
        <LoginForm onSubmit={noop} isSubmitting />
      </PreviewState>
      <PreviewState name="password-visible" setup={showPassword}>
        <LoginForm onSubmit={noop} />
      </PreviewState>
      <PreviewState name="long-text" setup={fillLongText}>
        <LoginForm onSubmit={noop} />
      </PreviewState>
    </main>
  );
}
