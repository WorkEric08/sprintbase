import React, { useMemo, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { BANCA_TARGET_PCT, MIN_BANCA_QUESTIONS, bancaQuestionCount, bancaStats } from '../utils/performance';
import { SETTING_KEYS } from '../utils/settings';
import Icon from './Icon';

const accuracyColor = (pct: number) => (pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444');

/**
 * Acerto por banca (só bancas com pelo menos 50 questões) e a comparação com a banca alvo. A banca vem do registro dos
 * blocos (marcada ao registrar). Some enquanto não há nenhuma banca registrada nem banca alvo.
 */
const BancaStatsCard: React.FC = () => {
  const { blockLogs, settings } = useAppData();
  const [expanded, setExpanded] = useState(false);
  const target = settings[SETTING_KEYS.targetBanca] ?? null;

  const stats = useMemo(() => bancaStats(blockLogs), [blockLogs]);
  const targetStat = stats.find(s => s.banca === target) ?? null;
  const targetCount = target ? bancaQuestionCount(blockLogs, target) : 0;

  if (stats.length === 0 && !target) return null;

  const best = [...stats].sort((a, b) => b.accuracy - a.accuracy)[0];
  const worst = [...stats].sort((a, b) => a.accuracy - b.accuracy)[0];

  return (
    <div data-testid="banca-card" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 overflow-hidden">
      <button onClick={() => stats.length > 0 && setExpanded(e => !e)} aria-expanded={expanded} className="w-full p-4 text-left space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Desempenho por banca</p>
            <p className="text-sm font-black text-gray-700 dark:text-gray-300 mt-0.5">
              {stats.length === 0
                ? 'Ainda sem dados'
                : `${stats.length} ${stats.length === 1 ? 'banca' : 'bancas'} com ${MIN_BANCA_QUESTIONS}+ questões`}
            </p>
          </div>
          {stats.length > 0 && <Icon name={expanded ? 'chevron-up' : 'chevron-down'} className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5 shrink-0" />}
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-2.5 border border-green-100 dark:border-green-900/20">
              <p className="text-[9px] font-black text-green-700 dark:text-green-500 uppercase tracking-widest">Melhor</p>
              <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug">{best.banca}</p>
              <p className="text-lg font-black text-green-600">{best.accuracy}%</p>
            </div>
            {worst.banca !== best.banca && (
              <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-2.5 border border-red-100 dark:border-red-900/20">
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Mais difícil</p>
                <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug">{worst.banca}</p>
                <p className="text-lg font-black text-red-500">{worst.accuracy}%</p>
              </div>
            )}
          </div>
        )}

        {target && targetStat && (
          <div className="flex items-start gap-2.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-2.5 border border-indigo-100 dark:border-indigo-900/20">
            <Icon name="crosshairs" className="text-indigo-500 text-xs mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Banca alvo: {target}</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug">
                {targetStat.accuracy}% de acerto · {targetStat.totalQuestions} questões
                {targetStat.accuracy < BANCA_TARGET_PCT && ` · abaixo dos ${BANCA_TARGET_PCT}% esperados`}
              </p>
            </div>
          </div>
        )}
        {target && !targetStat && (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-2.5 border border-amber-100 dark:border-amber-900/20">
            <Icon name="crosshairs" className="text-amber-500 text-xs mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 leading-snug">
              Banca alvo: {target}. Ainda sem dados suficientes: {targetCount} de {MIN_BANCA_QUESTIONS} questões registradas.
            </p>
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-50 dark:border-gray-800/60 divide-y divide-gray-50 dark:divide-gray-800/60">
          {stats.map(s => (
            <div key={s.banca} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{s.banca}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.totalCorrect}/{s.totalQuestions} certas · {s.blockCount} {s.blockCount === 1 ? 'bloco' : 'blocos'}</p>
                <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, backgroundColor: accuracyColor(s.accuracy) }} />
                </div>
              </div>
              <p className="text-lg font-black shrink-0" style={{ color: accuracyColor(s.accuracy) }}>{s.accuracy}%</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BancaStatsCard;
