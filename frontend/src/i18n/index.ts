import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './es.json';

let instance: i18n | undefined;

export function initI18n(): i18n {
  if (instance) return instance;
  const created = i18next.createInstance();
  void created.use(initReactI18next).init({
    lng: 'es',
    fallbackLng: 'es',
    resources: { es: { translation: es } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  instance = created;
  return created;
}
