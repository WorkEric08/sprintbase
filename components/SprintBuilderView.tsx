import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BLOCK_TYPES, BLOCK_TYPE_LABELS, BlockType, SprintItem, Subject } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { formatDuration } from '../utils/format';
import { uid } from '../utils/id';
import Icon from './Icon';

interface Props {
  subjects: Subject[];
  onStart: (items: SprintItem[]) => void;
  onClose: () => void;
}

const BREAK_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

const TYPE_BADGE: Record<BlockType, string> = {
  study: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  review: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  questions: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
};

const ROW = 'flex items-stretch bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden';
const STEP_BTN =
  'w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 disabled:opacity-30 active:scale-90';
const REMOVE_BTN = 'w-11 flex items-center justify-center text-gray-300 dark:text-gray-700 hover:text-red-400 transition-colors';

const SprintBuilderView: React.FC<Props> = ({ subjects, onStart, onClose }) => {
  useBackButton(onClose);
  const [queue, setQueue] = useState<SprintItem[]>([]);

  const subjectById = (id: string) => subjects.find(s => s.id === id);

  const totalMinutes = queue.reduce((acc, item) => {
    if (item.type === 'break') return acc + item.duration;
    return acc + (subjectById(item.subjectId)?.duration ?? 0);
  }, 0);
  const studyCount = queue.filter(i => i.type === 'study').length;

  const addStudy = (subjectId: string) =>
    setQueue(prev => [...prev, { id: uid(), type: 'study', subjectId, blockType: 'study' }]);

  const addBreak = () =>
    setQueue(prev => [...prev, { id: uid(), type: 'break', duration: 5 }]);

  const remove = (id: string) => setQueue(prev => prev.filter(i => i.id !== id));

  /** Toque no selo do bloco: Estudo → Revisão → Questões → Estudo… */
  const cycleBlockType = (id: string) =>
    setQueue(prev => prev.map(item => {
      if (item.id !== id || item.type !== 'study') return item;
      const next = BLOCK_TYPES[(BLOCK_TYPES.indexOf(item.blockType) + 1) % BLOCK_TYPES.length];
      return { ...item, blockType: next };
    }));

  const stepBreak = (id: string, delta: number) =>
    setQueue(prev => prev.map(item => {
      if (item.id !== id || item.type !== 'break') return item;
      const idx = BREAK_STEPS.indexOf(item.duration);
      const next = Math.max(0, Math.min(BREAK_STEPS.length - 1, idx + delta));
      return { ...item, duration: BREAK_STEPS[next] };
    }));

  return createPortal(
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col animate-slide-up">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 px-4 pb-3 safe-top border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-transform shrink-0"
        >
          <Icon name="arrow-left" className="text-sm" />
        </button>
        <h2 className="flex-1 text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Montar sprint</h2>
        {totalMinutes > 0 && (
          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
            <Icon name="clock" className="text-indigo-500 text-[10px]" />
            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              {formatDuration(totalMinutes)}
            </span>
          </div>
        )}
      </div>

      {/* Fila */}
      <div className="flex-1 overflow-y-auto modal-scroll p-4">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center">
              <Icon name="list-ul" className="text-gray-300 dark:text-gray-600 text-xl" />
            </div>
            <p className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Sprint vazio</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 max-w-[200px] leading-relaxed">
              Toque nas matérias abaixo para adicionar blocos
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {queue.map(item => {
              if (item.type === 'break') {
                const first = BREAK_STEPS.indexOf(item.duration) === 0;
                const last = BREAK_STEPS.indexOf(item.duration) === BREAK_STEPS.length - 1;
                return (
                  <div key={item.id} className={ROW}>
                    <div className="w-1 shrink-0 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 flex items-center gap-3 px-3 py-2.5">
                      <Icon name="mug-hot" className="text-gray-400 dark:text-gray-600 text-sm shrink-0" />
                      <span className="flex-1 text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-tight">Pausa</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => stepBreak(item.id, -1)} disabled={first} className={STEP_BTN} aria-label="Diminuir pausa">
                          <Icon name="minus" className="text-[8px]" />
                        </button>
                        <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 w-12 text-center">{item.duration}min</span>
                        <button onClick={() => stepBreak(item.id, 1)} disabled={last} className={STEP_BTN} aria-label="Aumentar pausa">
                          <Icon name="plus" className="text-[8px]" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => remove(item.id)} className={REMOVE_BTN} aria-label="Remover pausa">
                      <Icon name="times" className="text-xs" />
                    </button>
                  </div>
                );
              }

              const subject = subjectById(item.subjectId);
              if (!subject) return null;
              return (
                <div key={item.id} className={ROW}>
                  <div className="w-1 shrink-0" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1 flex items-center gap-3 px-3 py-3 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                    <span className="flex-1 text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight truncate">
                      {subject.title}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase shrink-0">{subject.duration}min</span>
                    <button
                      onClick={() => cycleBlockType(item.id)}
                      title="Toque para mudar o tipo"
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0 ${TYPE_BADGE[item.blockType]}`}
                    >
                      {BLOCK_TYPE_LABELS[item.blockType]}
                    </button>
                  </div>
                  <button onClick={() => remove(item.id)} className={REMOVE_BTN} aria-label="Remover bloco">
                    <Icon name="times" className="text-xs" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 shrink-0">
        <div className="chips-scroll flex gap-2 px-4 pt-3 pb-2">
          {subjects.map(subject => {
            const remaining = subject.blockCount - subject.completedBlocks.length;
            const inQueue = queue.filter(i => i.type === 'study' && i.subjectId === subject.id).length;
            const available = Math.max(0, remaining - inQueue);
            const exhausted = available === 0;
            return (
              <button
                key={subject.id}
                onClick={() => addStudy(subject.id)}
                disabled={exhausted}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-100 dark:border-gray-800 active:scale-95 transition-transform shrink-0 ${
                  exhausted ? 'bg-gray-50 dark:bg-gray-800/30 opacity-40 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-800/60'
                }`}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight whitespace-nowrap">
                  {subject.title}
                </span>
                <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: exhausted ? undefined : subject.color }}>
                  {available}/{remaining}
                </span>
              </button>
            );
          })}
          <button
            onClick={addBreak}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 active:scale-95 transition-transform shrink-0"
          >
            <Icon name="mug-hot" className="text-gray-400 text-[10px]" />
            <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tight">Pausa</span>
          </button>
        </div>

        <div className="px-4 pt-1 safe-bottom">
          <button
            onClick={() => onStart(queue)}
            disabled={studyCount === 0}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all ${
              studyCount === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.98]'
            }`}
          >
            <Icon name="play" />
            {studyCount === 0
              ? 'Adicione blocos para iniciar'
              : `Iniciar · ${studyCount} ${studyCount === 1 ? 'bloco' : 'blocos'} · ${formatDuration(totalMinutes)}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SprintBuilderView;
