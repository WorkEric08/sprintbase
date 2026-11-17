import React, { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { MIN_SUBTOPIC_QUESTIONS, SubtopicStat, strongAndWeak } from '../utils/performance';
import Icon from './Icon';

const color = (pct: number) => (pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444');

const List: React.FC<{ title: string; icon: 'trophy' | 'circle-exclamation'; tone: string; items: SubtopicStat[]; testId: string }> = ({ title, icon, tone, items, testId }) => (
  <div data-testid={testId} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 overflow-hidden">
    <div className="px-4 pt-4 pb-2 flex items-center gap-2">
      <Icon name={icon} className={`text-xs ${tone}`} />
      <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</p>
    </div>
    <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
      {items.map(s => (
        <div key={`${s.subjectId}-${s.subtopic}`} className="px-4 py-2.5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.subjectColor }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug">{s.subtopic}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{s.subjectTitle} · {s.totalCorrect}/{s.totalQuestions} certas</p>
          </div>
          <span className="text-sm font-black shrink-0" style={{ color: color(s.accuracy) }}>{s.accuracy}%</span>
        </div>
      ))}
    </div>
  </div>
);

/** Os subtópicos em que você mais e menos acerta (mínimo de 3 questões), calculados dos registros dos blocos. */
const SubtopicPointsCard: React.FC = () => {
  const { blockLogs } = useAppData();
  const { strong, weak } = useMemo(() => strongAndWeak(blockLogs), [blockLogs]);
  if (strong.length === 0 && weak.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Por subtópico</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {strong.length > 0 && <List title="Pontos fortes" icon="trophy" tone="text-green-600" items={strong} testId="strong-points" />}
        {weak.length > 0 && <List title="Pontos fracos" icon="circle-exclamation" tone="text-red-500" items={weak} testId="weak-points" />}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">Só entram subtópicos com {MIN_SUBTOPIC_QUESTIONS} questões ou mais, registrados no fim dos blocos. Forte: acerto de 70% ou mais.</p>
    </div>
  );
};

export default SubtopicPointsCard;
