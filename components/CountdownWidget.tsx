import React, { useState } from 'react';
import { useToday } from '../hooks/useToday';
import { MILESTONES, Urgency, daysUntilExam, formatExamDate, urgencyOf } from '../utils/exam';
import Icon from './Icon';

interface Props {
  /** "YYYY-MM-DD" da prova. */
  examDate: string;
  examName?: string;
  onEditDate: () => void;
}

const STYLES: Record<Urgency, { bar: string; text: string; badge: string }> = {
  far: { bar: 'bg-gray-400 dark:bg-gray-600', text: 'text-gray-500 dark:text-gray-400', badge: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
  mid: { bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
  near: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  urgent: { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
};

/** Quanto falta para a prova. Acompanha a virada do dia sozinho (useToday). */
const CountdownWidget: React.FC<Props> = ({ examDate, examName, onEditDate }) => {
  const today = useToday();
  const [expanded, setExpanded] = useState(false);
  const days = daysUntilExam(examDate, today);

  if (days < 0) {
    return (
      <div data-testid="countdown" className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="flag-checkered" className="text-gray-400 text-sm shrink-0" />
          <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Prova encerrada</span>
        </div>
        <button onClick={onEditDate} className="shrink-0 py-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Atualizar data</button>
      </div>
    );
  }

  const urgency = urgencyOf(days);
  const style = STYLES[urgency];
  // A barra enche conforme a prova se aproxima (referência: 365 dias).
  const range = Math.max(days, 365);
  const progress = Math.min(100, Math.round(((range - days) / range) * 100));

  return (
    <div data-testid="countdown" className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setExpanded(e => !e)} aria-expanded={expanded} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${style.badge}`}>
              {days === 0 ? 'Hoje' : `${days} ${days === 1 ? 'dia' : 'dias'}`}
            </span>
            <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase tracking-tight">{examName ?? 'para a prova'}</span>
          </div>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5 shrink-0" />
        </div>

        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${style.bar}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 gap-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{formatExamDate(examDate)}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest ${style.text}`}>{progress}% do caminho</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 space-y-3 animate-fade-in">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Marcos sugeridos para esta fase</p>
          {MILESTONES[urgency].map((m, i) => (
            <div key={m} className="flex items-start gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${style.badge}`}>{i + 1}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{m}</span>
            </div>
          ))}
          <button onClick={onEditDate} className="py-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-indigo-500 transition-colors">
            <Icon name="calendar-days" className="mr-1" />
            Alterar data da prova
          </button>
        </div>
      )}
    </div>
  );
};

export default CountdownWidget;
