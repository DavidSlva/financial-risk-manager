import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App';
import { initI18n } from './i18n/index';
import { applyStyleTokens } from './styles/apply-tokens';
import './styles/login.css';
import './styles/score.css';

const i18n = initI18n();
applyStyleTokens();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  );
}
