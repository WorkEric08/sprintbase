import React, { useState } from 'react';
import { StreakState } from '../types';
import { bonusLabel, STUDY_DAYS_PER_BONUS, streakLabel, streakSubLabel } from '../utils/streakUtils';

interface Props {
  state: StreakState;
  /** Versão de uma linha (chip) para o cabeçalho do Ciclo. */
  compact?: boolean;
}

const CAPTION = 'text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest';

/** Ofensiva (dias seguidos) e dias bônus. Os textos só incentivam, nunca cobram. */
const StreakWidget: React.FC<Props> = ({ state, compact = false }) => {
  const [showDetail, setShowDetail] = useState(false);
  const hasStreak = state.currentStreak > 0;

  if (compact) {
    return (
      <div
        data-testid="streak-chip"
        aria-label={hasStreak ? `${streakLabel(state)}` : 'Sem sequência ainda'}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <i className={`fas fa-fire text-xs ${hasStreak ? 'text-orange-500' : 'text-gray-300 dark:text-gray-700'}`} />
        <span className={`text-[11px] font-black ${hasStreak ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}`}>
          {hasStreak ? `${state.currentStreak}d` : '—'}
        </span>
        {state.bonusBalance > 0 && (
          <span className="text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
            +{state.bonusBalance}
          </span>
        )}
      </div>
    );
  }

  const daysToBonus = STUDY_DAYS_PER_BONUS - (state.currentStreak % STUDY_DAYS_PER_BONUS);

  return (
    <div className="space-y-2" data-testid="streak-widget">
      {state.bonusUsedRecently && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl px-4 py-3 animate-fade-in">
          <i className="fas fa-heart text-amber-500 text-sm shrink-0" />
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
            Tudo bem descansar. Usamos um dia bônus — sua sequência continua.
          </p>
        </div>
      )}

      <button
        onClick={() => setShowDetail(v => !v)}
        aria-expanded={showDetail}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 text-left transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasStreak ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
              <i className={`fas fa-fire text-lg ${hasStreak ? 'text-orange-500' : 'text-gray-300 dark:text-gray-700'}`} />
            </div>
            <div className="min-w-0">
              <p className={`text-xl font-black leading-none ${hasStreak ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}`}>
                {streakLabel(state)}
              </p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-1">
                {streakSubLabel(state)}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end mb-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < state.bonusBalance ? 'bg-amber-400' : 'bg-gray-100 dark:bg-gray-800'}`} />
              ))}
            </div>
            <p className={CAPTION}>{state.bonusBalance === 0 ? 'Sem bônus' : `${state.bonusBalance} bônus`}</p>
          </div>
        </div>

        {showDetail && (
          <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800/60 space-y-2.5 animate-fade-in">
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: state.currentStreak, label: 'Atual' },
                { value: state.longestStreak, label: 'Recorde' },
                { value: state.totalStudyDays, label: 'Total' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-lg font-black text-gray-800 dark:text-gray-100">{item.value}</p>
                  <p className={CAPTION}>{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-100 dark:border-amber-900/20">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                <i className="fas fa-circle-info mr-1.5" />
                {bonusLabel(state.bonusBalance)}. Dias bônus são acumulados a cada {STUDY_DAYS_PER_BONUS} dias de estudo e usados automaticamente quando você precisa descansar.
              </p>
            </div>
            {state.bonusBalance === 0 && hasStreak && (
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 text-center">
                Estude por mais {daysToBonus} {daysToBonus === 1 ? 'dia' : 'dias'} para ganhar um dia bônus.
              </p>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export default StreakWidget;
