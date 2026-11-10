import { useTranslation } from 'react-i18next';

export function ScorePlaceholder({ rut }: { rut: string }) {
  const { t } = useTranslation();
  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-card__title">{t('session.placeholder.title')}</h1>
        <p className="login-card__subtitle">
          <span>{t('session.placeholder.rut')}</span> <span>{rut}</span>
        </p>
      </section>
    </main>
  );
}
