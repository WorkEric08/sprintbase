import React, { useMemo, useState } from 'react';
import { BLOCK_TYPES, BLOCK_TYPE_COLORS, BLOCK_TYPE_LABELS, BlockType } from '../types';
import { useAppData } from '../contexts/AppDataContext';
import { useStreak } from '../hooks/useStreak';
import { Period, formatMinutes, getPeriodStart } from '../utils/format';
import HeatmapView from './HeatmapView';
import StreakWidget from './StreakWidget';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CARD = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50';
const CAPTION = 'text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest';

function accuracyColor(pct: number | null): string {
  if (pct === null) return '#9ca3af';
  return pct >= 70 ? '#16a34a' : '#ef4444';
}

const ProgressView: React.FC = () => {
  const { subjects, blockLogs } = useAppData();
  const { streak, enabled: streakEnabled } = useStreak();
  const [period, setPeriod] = useState<Period>('day');

  // Progresso geral: blocos concluídos / meta de todas as matérias.
  const overall = useMemo(() => {
    const total = subjects.reduce((a, s) => a + s.blockCount, 0);
    const done = subjects.reduce((a, s) => a + s.completedBlocks.length, 0);
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [subjects]);

  // Métricas do período selecionado.
  const metrics = useMemo(() => {
    const start = getPeriodStart(period);
    const typeCounts: Record<BlockType, number> = { study: 0, review: 0, questions: 0 };
    let blocks = 0;
    let minutes = 0;

    const bySubject = subjects
      .map(s => {
        const inPeriod = s.completedBlocks.filter(b => b.timestamp >= start);
        inPeriod.forEach(b => { typeCounts[b.type] += 1; });
        blocks += inPeriod.length;
        minutes += inPeriod.length * s.duration;
        return {
          id: s.id, title: s.title, color: s.color, blockCount: s.blockCount,
          blocks: inPeriod.length, minutes: inPeriod.length * s.duration,
        };
      })
      .filter(s => s.blocks > 0)
      .sort((a, b) => b.minutes - a.minutes);

    let questions = 0;
    let correct = 0;
    blockLogs.forEach(l => {
      if (l.timestamp < start) return;
      questions += l.questionsTotal;
      correct += l.questionsCorrect;
    });

    return {
      blocks, minutes, bySubject, typeCounts, questions,
      accuracy: questions > 0 ? Math.round((correct / questions) * 100) : null,
    };
  }, [subjects, blockLogs, period]);

  const usedTypes = BLOCK_TYPES.filter(t => metrics.typeCounts[t] > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-2">
      {/* Anel de progresso geral */}
      <div className="flex flex-col items-center py-3">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle r={RING_RADIUS} cx="50" cy="50" fill="transparent" strokeWidth="9" className="stroke-gray-100 dark:stroke-gray-800" />
            <circle
              r={RING_RADIUS} cx="50" cy="50" fill="transparent" strokeWidth="9" strokeLinecap="round"
              className="stroke-indigo-600 dark:stroke-indigo-500 transition-all duration-1000"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - overall.pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-gray-800 dark:text-white leading-none">{overall.pct}%</span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Concluído</span>
          </div>
        </div>
        <div className="mt-3 text-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Progresso geral</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {subjects.length === 0 ? 'Nenhuma matéria cadastrada' : `${overall.done} de ${overall.total} blocos`}
          </p>
        </div>
      </div>

      {streakEnabled && <StreakWidget state={streak} />}

      {/* Seletor de período */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Métricas</h3>
        <div className="flex bg-gray-100 dark:bg-gray-800/80 rounded-xl p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                period === p.id
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards: tempo, blocos, acerto */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <i className="fas fa-hourglass-half text-indigo-500 text-[10px]" />
            <span className={CAPTION}>Tempo</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white leading-none">{formatMinutes(metrics.minutes)}</p>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <i className="fas fa-bolt text-indigo-500 text-[10px]" />
            <span className={CAPTION}>Blocos</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-800 dark:text-white leading-none">
            {metrics.blocks === 0 ? '—' : metrics.blocks}
          </p>
        </div>

        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-1.5 mb-3">
            <i className="fas fa-bullseye text-indigo-500 text-[10px]" />
            <span className={CAPTION}>Acerto</span>
          </div>
          <p className="text-xl sm:text-2xl font-black leading-none" style={{ color: accuracyColor(metrics.accuracy) }}>
            {metrics.accuracy !== null ? `${metrics.accuracy}%` : '—'}
          </p>
          {metrics.questions > 0 && (
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 mt-1">{metrics.questions} questões</p>
          )}
        </div>
      </div>

      {/* Distribuição por tipo de bloco (só quando há mais de um tipo) */}
      {usedTypes.length > 1 && (
        <div className={`${CARD} p-4 space-y-2`}>
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Distribuição</p>
          {usedTypes.map(t => {
            const pct = Math.round((metrics.typeCounts[t] / metrics.blocks) * 100);
            return (
              <div key={t} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{BLOCK_TYPE_LABELS[t]}</span>
                  <span className="text-[10px] font-black" style={{ color: BLOCK_TYPE_COLORS[t] }}>{pct}%</span>
                </div>
                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: BLOCK_TYPE_COLORS[t] }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Por matéria */}
      {metrics.bySubject.length > 0 ? (
        <div className="space-y-4 pt-1">
          {metrics.bySubject.map(s => (
            <div key={s.id}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{s.title}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 dark:text-gray-600 shrink-0 ml-2">
                  <span>{s.blocks} / {s.blockCount} blocos</span>
                  <span>·</span>
                  <span>{formatMinutes(s.minutes)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: s.blockCount > 0 ? `${Math.min((s.blocks / s.blockCount) * 100, 100)}%` : '0%',
                    backgroundColor: s.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-gray-400 dark:text-gray-600 text-sm border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          Nenhuma atividade neste período
        </div>
      )}

      {/* Calendário de estudos */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Calendário</h3>
        <HeatmapView />
      </div>
    </div>
  );
};

export default ProgressView;
