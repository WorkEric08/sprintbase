import React, { useMemo, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { currentIntervalLabel, daysUntilDue, isOverdue, isPendingNow, nextIntervalLabel } from '../utils/reviewAlgorithm';
import Icon from './Icon';

type Filter = 'pending' | 'upcoming' | 'done';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'upcoming', label: 'A vencer' },
  { id: 'done', label: 'Dominadas' },
];

function dueText(days: number): string {
  if (days < 0) return `atrasada ${-days} ${days === -1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

/**
 * Revisão espaçada em números: o que está pendente, o que vem a seguir e o que já foi dominado (passou do D+60).
 * As revisões se fazem na "pausa de revisão" do sprint (Montar sprint avisa quando há pendentes). Some sem nenhuma.
 */
const ReviewStatusCard: React.FC = () => {
  const { reviewItems, subjects } = useAppData();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const now = Date.now();

  const live = useMemo(() => {
    const ids = new Set(subjects.map(s => s.id));
    return reviewItems.filter(i => ids.has(i.subjectId));
  }, [reviewItems, subjects]);

  const groups = useMemo(() => ({
    pending: live.filter(i => isPendingNow(i, now)).sort((a, b) => a.nextReviewAt - b.nextReviewAt),
    upcoming: live.filter(i => !i.consolidated && !isPendingNow(i, now)).sort((a, b) => a.nextReviewAt - b.nextReviewAt),
    done: live.filter(i => i.consolidated),
  }), [live, now]);

  if (live.length === 0) return null;

  const overdue = groups.pending.filter(i => isOverdue(i, now)).length;
  const shown = groups[filter];

  return (
    <div data-testid="review-status" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full p-4 text-left space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Revisão espaçada</p>
            <p className="text-sm font-black text-gray-700 dark:text-gray-300 mt-0.5">
              {groups.pending.length === 0 ? 'Nada pendente hoje' : `${groups.pending.length} ${groups.pending.length === 1 ? 'revisão pendente' : 'revisões pendentes'}`}
            </p>
          </div>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5 shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { n: groups.pending.length, label: 'Pendentes', tone: 'text-amber-600' },
            { n: overdue, label: 'Atrasadas', tone: 'text-red-500' },
            { n: groups.done.length, label: 'Dominadas', tone: 'text-green-600' },
          ].map(c => (
            <div key={c.label} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl py-2.5">
              <p className={`text-xl font-black ${c.tone}`}>{c.n}</p>
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{c.label}</p>
            </div>
          ))}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-50 dark:border-gray-800/60 p-4 space-y-3">
          <div className="flex bg-gray-100 dark:bg-gray-800/80 rounded-xl p-0.5" role="group" aria-label="Filtrar revisões">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  filter === f.id ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {f.label} · {groups[f.id].length}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">Nenhuma revisão aqui.</p>
          ) : (
            <ul className="space-y-2">
              {shown.map(i => (
                <li key={i.id} data-testid="review-row" className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: i.subjectColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug">{i.subtopic}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">{i.subjectTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">{currentIntervalLabel(i)}</p>
                    <p className={`text-[10px] font-bold ${isOverdue(i, now) ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      {i.consolidated ? 'dominada' : `${dueText(daysUntilDue(i, now))}${isPendingNow(i, now) ? '' : ` · depois ${nextIntervalLabel(i)}`}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewStatusCard;
