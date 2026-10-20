import React from 'react';
import { BLOCK_TYPE_COLORS, BlockType, Subject } from '../types';

interface Props {
  subject: Subject;
  onReset: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Cor do quadradinho: estudo usa a cor da matéria; revisão/questões usam a cor do tipo. */
function blockColor(type: BlockType, subjectColor: string): string {
  return type === 'study' ? subjectColor : BLOCK_TYPE_COLORS[type];
}

const ICON_BTN =
  'w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 transition-colors';

const SubjectCard: React.FC<Props> = ({ subject, onReset, onEdit, onDelete }) => {
  const completed = subject.completedBlocks.length;
  const total = subject.blockCount;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: subject.color }} />

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
            <span className="font-black text-gray-800 dark:text-gray-100 text-sm uppercase tracking-tight truncate">
              {subject.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase">{subject.duration}min</span>
            <button onClick={onReset} title="Resetar blocos" aria-label="Resetar blocos" className={`${ICON_BTN} hover:text-amber-500`}>
              <i className="fas fa-rotate-left text-[10px]" />
            </button>
            <button onClick={onEdit} title="Editar" aria-label="Editar matéria" className={`${ICON_BTN} hover:text-indigo-500`}>
              <i className="fas fa-pencil text-[10px]" />
            </button>
            <button onClick={onDelete} title="Excluir" aria-label="Excluir matéria" className={`${ICON_BTN} hover:text-red-500`}>
              <i className="fas fa-trash text-[10px]" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-0.5" style={{ color: subject.color }}>
              <span className="text-3xl font-black tracking-tighter leading-none">{pct}</span>
              <span className="text-base font-black leading-none">%</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                {completed} / {total}
              </p>
              <p className="text-[9px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-wider mt-0.5">blocos</p>
            </div>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: subject.color,
                boxShadow: pct > 0 ? `0 0 8px ${subject.color}66` : undefined,
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {Array.from({ length: total }).map((_, i) => {
            const block = subject.completedBlocks[i];
            return (
              <div
                key={i}
                className="w-4 h-4 rounded-sm transition-all duration-500"
                style={
                  block
                    ? { backgroundColor: blockColor(block.type, subject.color) }
                    : { border: '1.5px solid currentColor', opacity: 0.15 }
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;
