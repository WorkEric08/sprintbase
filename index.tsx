import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css'; // ícones empacotados (funcionam offline / no APK)
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initNative } from './utils/native';
import { initPWA } from './services/pwa';

initNative();
initPWA();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
