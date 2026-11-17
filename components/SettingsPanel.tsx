import React, { Suspense, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { BANCAS } from '../types';
import { isDevModeUser } from '../utils/devMode';
import { resolveEdital } from '../utils/edital';
import { daysUntilExam, formatExamDate, isDateKey } from '../utils/exam';
import { todayKey } from '../utils/dateUtils';
import { SETTING_KEYS, isStreakEnabled } from '../utils/settings';
import BackupCard from './BackupCard';
import PWACard from './PWACard';
import EditalPickerModal from './EditalPickerModal';
import { DatePickerModal, OverlayFallback } from './screens';
import Icon from './Icon';

const LABEL = 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';

const THEME_OPTIONS = [
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Escuro', icon: 'moon' },
] as const;

const SettingsPanel: React.FC = () => {
  const { userName, setUserName, theme, setTheme, settings, setSetting, removeSetting } = useAppData();
  const streakEnabled = isStreakEnabled(settings);
  const [pickingEdital, setPickingEdital] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);

  const edital = resolveEdital(settings[SETTING_KEYS.selectedEdital], settings[SETTING_KEYS.customEdital]);
  const examDate = isDateKey(settings[SETTING_KEYS.examDate]) ? settings[SETTING_KEYS.examDate] : null;
  const examDays = examDate ? daysUntilExam(examDate, todayKey()) : null;
  const targetBanca = settings[SETTING_KEYS.targetBanca] ?? null;

  return (
    <div className="max-w-lg mx-auto space-y-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center shrink-0">
          <Icon name="gear" className="text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">Configurações</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">{userName ? `Perfil: ${userName}` : 'Personalize seu app'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className={LABEL} htmlFor="user-name">Seu nome</label>
        <input
          id="user-name"
          type="text"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          placeholder="Como devemos te chamar?"
          maxLength={30}
          className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-700"
        />
      </div>

      <div className="space-y-2">
        <span className={LABEL}>Tema</span>
        <div className="grid grid-cols-2 gap-3">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                theme === opt.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon name={opt.icon} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className={LABEL}>Ofensiva</span>
        <button
          role="switch"
          aria-checked={streakEnabled}
          aria-label="Mostrar ofensiva"
          onClick={() => setSetting(SETTING_KEYS.streakEnabled, streakEnabled ? 'false' : 'true')}
          className="w-full flex items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Mostrar ofensiva</span>
            <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">Dias seguidos de estudo e dias bônus. O calendário continua aparecendo.</span>
          </span>
          <span className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${streakEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${streakEnabled ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <span className={LABEL}>Prova</span>
        <div className="space-y-2">
          <button
            onClick={() => setPickingEdital(true)}
            className="w-full flex items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
          >
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Edital</span>
              <span data-testid="edital-value" className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {edital ? edital.name : 'Nenhum: toque para escolher o ENEM ou criar o seu'}
              </span>
            </span>
            <Icon name="chevron-right" className="text-xs text-gray-300 dark:text-gray-600 shrink-0" />
          </button>

          <button
            onClick={() => setPickingDate(true)}
            className="w-full flex items-center justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
          >
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Data da prova</span>
              <span data-testid="exam-date-value" className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {examDate
                  ? `${formatExamDate(examDate)}${examDays !== null && examDays >= 0 ? ` · ${examDays === 0 ? 'é hoje' : `faltam ${examDays} ${examDays === 1 ? 'dia' : 'dias'}`}` : ' · já passou'}`
                  : 'Não definida: aparece uma contagem regressiva na tela inicial'}
              </span>
            </span>
            <Icon name="calendar-days" className="text-sm text-gray-300 dark:text-gray-600 shrink-0" />
          </button>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 space-y-3">
            <span className="block min-w-0">
              <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Banca alvo</span>
              <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">Vem marcada no registro dos blocos e é comparada em Progresso.</span>
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Banca alvo">
              {BANCAS.map(b => (
                <button
                  key={b}
                  onClick={() => (targetBanca === b ? removeSetting(SETTING_KEYS.targetBanca) : setSetting(SETTING_KEYS.targetBanca, b))}
                  aria-pressed={targetBanca === b}
                  className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all active:scale-95 ${
                    targetBanca === b
                      ? 'border-transparent bg-indigo-600 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <BackupCard />

      <PWACard />

      {pickingEdital && <EditalPickerModal onClose={() => setPickingEdital(false)} />}
      {pickingDate && (
        <Suspense fallback={<OverlayFallback />}>
          <DatePickerModal
            value={examDate}
            onSelect={date => { setSetting(SETTING_KEYS.examDate, date); setPickingDate(false); }}
            onClear={() => { removeSetting(SETTING_KEYS.examDate); setPickingDate(false); }}
            onClose={() => setPickingDate(false)}
          />
        </Suspense>
      )}

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-1">
        <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">Sprint Base · v{__APP_VERSION__}</p>
        {isDevModeUser(userName) && (
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Modo desenvolvedor ativo</p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
