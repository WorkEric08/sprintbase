import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initNative } from './utils/native';
import { initPWA } from './services/pwa';
import { whenFirstDataReady } from './contexts/AppDataContext';
import { mark } from './utils/perf';

mark('boot');
initNative();
initPWA();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado');

// A leitura das matérias e configurações já começou (contexts/AppDataContext.tsx). Espera por ela, com limite de
// 150 ms, para o React desenhar o Ciclo já com os dados no primeiro quadro em vez de "carregando" e depois os dados.
void whenFirstDataReady(150).then(() => {
  mark('render');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
});
