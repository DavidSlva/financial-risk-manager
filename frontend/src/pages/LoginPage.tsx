import { useTranslation } from 'react-i18next';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-card__title">{t('login.title')}</h1>
        <p className="login-card__subtitle">{t('login.subtitle')}</p>
        <LoginForm onSubmit={() => {}} />
      </section>
    </main>
  );
}
