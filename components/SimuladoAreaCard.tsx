import React, { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { AreaStat, PASS_PCT, Trend, computeAreaStats, recommend } from '../utils/simuladoStats';
import Icon, { IconName } from './Icon';

const TREND: Record<Trend, { icon: IconName; color: string; label: string }> = {
  up: { icon: 'arrow-trend-up', color: '#16a34a', label: 'Melhorando' },
  down: { icon: 'arrow-trend-down', color: '#ef4444', label: 'Piorando' },
  stable: { icon: 'minus', color: '#6b7280', label: 'Estável' },
  new: { icon: 'star', color: '#6366f1', label: 'Primeira vez' },
};

const Row: React.FC<{ stat: AreaStat }> = ({ stat }) => {
  const t = TREND[stat.trend];
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.color + '1f', color: t.color }}>
        <Icon name={t.icon} className="text-xs" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <div className="w-2 h-2 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{stat.name}</span>
        </div>
        <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${stat.lastScore}%`, backgroundColor: stat.color }} />
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className="text-sm font-black" style={{ color: stat.lastScore >= PASS_PCT ? '#16a34a' : '#ef4444' }}>{stat.lastScore}%</p>
        {/* o estado nunca é só a cor: o texto diz a tendência */}
        <p className="text-[10px] font-bold" style={{ color: t.color }}>
          {stat.delta !== null ? `${stat.delta > 0 ? '+' : ''}${stat.delta}pp` : t.label}
        </p>
      </div>
    </div>
  );
};

/** Desempenho por área ao longo dos simulados (aba Progresso). Some enquanto não há nenhum simulado com gabarito. */
const SimuladoAreaCard: React.FC = () => {
  const { simulados } = useAppData();
  const stats = useMemo(() => computeAreaStats(simulados), [simulados]);
  const tip = useMemo(() => recommend(stats), [stats]);

  if (stats.length === 0) return null;

  return (
    <div data-testid="simulado-area-card" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-50 dark:border-gray-800/60">
        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Simulados · desempenho por área</p>
        <p className="text-sm font-black text-gray-700 dark:text-gray-300 mt-0.5">
          Baseado em {simulados.length} {simulados.length === 1 ? 'simulado' : 'simulados'}
        </p>
      </div>

      {tip && (
        <div className={`mx-4 mt-3 rounded-xl p-3 flex items-start gap-2 border ${
          tip.tone === 'warning'
            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-800 dark:text-red-300'
            : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20 text-green-800 dark:text-green-300'
        }`}>
          <Icon name={tip.tone === 'warning' ? 'circle-exclamation' : 'circle-check'} className="text-xs mt-0.5 shrink-0" />
          <p className="text-xs font-bold leading-relaxed">{tip.text}</p>
        </div>
      )}

      <div className="divide-y divide-gray-50 dark:divide-gray-800/60 mt-2">
        {stats.map(s => <Row key={s.name} stat={s} />)}
      </div>
    </div>
  );
};

export default SimuladoAreaCard;
