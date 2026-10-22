import React, { useEffect, useRef, useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { applyUpdate, checkForUpdate, installApp } from '../services/pwa';
import { isNative } from '../utils/platform';

const LABEL = 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';
const BTN = 'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95';

/**
 * Instalar e atualizar o PWA. Não aparece no APK (lá a atualização é um APK novo)
 * nem no servidor de desenvolvimento (sem service worker).
 */
const PWACard: React.FC = () => {
  const { canInstall, installed, needRefresh, supported } = usePWA();
  const [checking, setChecking] = useState(false);
  const [upToDate, setUpToDate] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (isNative || (!supported && !canInstall && !installed)) return null;

  const handleCheck = async () => {
    setChecking(true);
    setUpToDate(false);
    await checkForUpdate();
    // O aviso de versão nova (`needRefresh`) chega depois do download; dá um tempo antes de concluir.
    timerRef.current = setTimeout(() => {
      setChecking(false);
      setUpToDate(true);
    }, 2000);
  };

  return (
    <div className="space-y-2">
      <span className={LABEL}>Aplicativo</span>

      {canInstall && (
        <button
          onClick={() => { void installApp(); }}
          className={`${BTN} border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400`}
        >
          <i className="fas fa-download" />
          Instalar app
        </button>
      )}

      {installed && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
          <i className="fas fa-circle-check text-green-500 mr-1.5" />
          Rodando como app instalado.
        </p>
      )}

      {supported && (needRefresh ? (
        <button
          onClick={() => { void applyUpdate(); }}
          className={`${BTN} border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400`}
        >
          <i className="fas fa-arrows-rotate" />
          Nova versão — atualizar agora
        </button>
      ) : (
        <button
          onClick={() => { void handleCheck(); }}
          disabled={checking}
          className={`${BTN} border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 disabled:opacity-60`}
        >
          <i className={`fas fa-arrows-rotate ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando…' : 'Verificar atualizações'}
        </button>
      ))}

      {supported && upToDate && !needRefresh && !checking && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">Você já está na versão mais recente.</p>
      )}
    </div>
  );
};

export default PWACard;
