import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AppProviders } from './app/Providers';
import './shared/styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден корневой элемент приложения.');

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);
