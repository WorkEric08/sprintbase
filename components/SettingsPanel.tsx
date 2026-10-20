import React from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { isDevModeUser } from '../utils/devMode';

const LABEL = 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';

const THEME_OPTIONS = [
  { id: 'light', label: 'Claro', icon: 'fa-sun' },
  { id: 'dark', label: 'Escuro', icon: 'fa-moon' },
] as const;

const SettingsPanel: React.FC = () => {
  const { userName, setUserName, theme, setTheme } = useAppData();

  return (
    <div className="max-w-lg mx-auto space-y-7">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center shrink-0">
          <i className="fas fa-gear text-gray-600 dark:text-gray-400" />
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
              <i className={`fas ${opt.icon}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center space-y-1">
        <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">Sprint Base · v0.1.0</p>
        {isDevModeUser(userName) && (
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Modo desenvolvedor ativo</p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
