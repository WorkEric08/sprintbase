import React, { Suspense, useEffect, useRef, useState } from 'react';
import { AppDataProvider, useAppData } from './contexts/AppDataContext';
import CicloView from './components/CicloView';
import { ProgressView, SettingsPanel, preloadScreens } from './components/screens';
import WelcomeBackCard from './components/WelcomeBackCard';
import { useStreak } from './hooks/useStreak';
import { daysBetween } from './utils/dateUtils';
import { hideSplash } from './utils/native';
import { mark } from './utils/perf';
import { SETTING_KEYS } from './utils/settings';
import { shouldShowWelcomeBack } from './utils/streakUtils';
import Icon from './components/Icon';

/**
 * Para adicionar um módulo novo (Simulado, Redação...), basta incluir uma entrada aqui:
 * a bottom nav (mobile) e a sidebar (desktop) são geradas a partir desta lista.
 */
const TABS = [
  { id: 'ciclo', label: 'Ciclo', icon: 'rotate', View: CicloView },
  { id: 'progresso', label: 'Progresso', icon: 'chart-line', View: ProgressView },
  { id: 'config', label: 'Ajustes', icon: 'gear', View: SettingsPanel },
] as const;

type TabId = typeof TABS[number]['id'];

const Spinner: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div className="w-10 h-10 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin" />
  </div>
);

const Logo: React.FC = () => (
  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
    <Icon name="rotate" className="text-white text-sm" />
  </div>
);

const Shell: React.FC = () => {
  const { loading, userName, settings, setSetting } = useAppData();
  const { streak, today, enabled: streakEnabled, ready: streakReady } = useStreak();
  const [activeTab, setActiveTab] = useState<TabId>('ciclo');
  const [showWelcome, setShowWelcome] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // "Bem-vindo de volta": só ao abrir o app (não no meio do uso) e no máximo uma vez por dia.
  // Espera os registros de bloco chegarem (logo após a primeira pintura): sem eles não dá para saber há quantos dias a pessoa não estuda.
  const welcomeChecked = useRef(false);
  useEffect(() => {
    if (loading || !streakReady || welcomeChecked.current) return;
    welcomeChecked.current = true;
    if (streakEnabled && shouldShowWelcomeBack(streak, today) && settings[SETTING_KEYS.welcomeBackShown] !== today) {
      setShowWelcome(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, streakReady]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    setSetting(SETTING_KEYS.welcomeBackShown, today);
  };

  // Cada aba abre no topo, não na rolagem da aba anterior.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // A splash nativa fica até os dados carregarem (no navegador não faz nada).
  useEffect(() => {
    if (loading) return;
    mark('commit');
    hideSplash();
    // Dois quadros depois da primeira renderização com dados = a tela inicial já está pintada.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      mark('ready');
      preloadScreens(); // as outras telas chegam em segundo plano, sem atrasar a primeira pintura
    }));
  }, [loading]);

  if (loading) return <Spinner />;

  const ActiveView = TABS.find(t => t.id === activeTab)!.View;

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar (tablet / desktop) */}
      <aside className="hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 w-16 lg:w-56 shrink-0">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-5 gap-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <Logo />
          <span className="hidden lg:block font-black text-gray-800 dark:text-white text-sm uppercase tracking-[0.15em]">Sprint</span>
        </div>

        <nav className="flex-1 p-2 space-y-1 pt-4 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 py-3 lg:px-4 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
            >
              <Icon name={tab.icon} className="text-base w-5 text-center" />
              <span className="hidden lg:block text-xs font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-center lg:justify-start gap-2.5 py-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <Icon name="user" className="text-[10px] text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="hidden lg:block text-xs font-bold text-gray-500 truncate max-w-[140px]">{userName || 'Estudante'}</span>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main
        ref={mainRef}
        className="scroll-container p-4 md:p-6 lg:p-8 pt-[max(env(safe-area-inset-top),1rem)] md:pt-6 lg:pt-8 pb-24 md:pb-8"
      >
        <div key={activeTab} className="animate-fade-in">
          <Suspense fallback={null}>
            <ActiveView />
          </Suspense>
        </div>
      </main>

      {showWelcome && streak.lastStudyDate && (
        <WelcomeBackCard
          userName={userName}
          daysAbsent={daysBetween(streak.lastStudyDate, today)}
          longestStreak={streak.longestStreak}
          onDismiss={dismissWelcome}
        />
      )}

      {/* Bottom nav (mobile). Telas de sprint/formulários são fixas em z-50+, então cobrem esta barra (z-40). */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 pt-3 safe-bottom flex items-center">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 transition-all active:scale-90 ${
              activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'
            }`}
          >
            <Icon name={tab.icon} className="text-xl" />
            <span className="text-[9px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const App: React.FC = () => (
  <AppDataProvider>
    <Shell />
  </AppDataProvider>
);

export default App;
