import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/wonk.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { AnnouncerProvider } from './hooks/useAnnouncer';
import { applySettingsToDocument } from './hooks/useSettings';
import { loadSettings } from './state/settings';

// Apply theme/contrast before first paint to avoid a flash of the wrong theme.
applySettingsToDocument(loadSettings());

// Offline support (production only; the dev server serves files that change on every edit).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline caching is a bonus; the app works online without it.
    });
  });
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <AnnouncerProvider>
      <App />
    </AnnouncerProvider>
  </StrictMode>,
);
