import React, { useRef, useState } from 'react';
import { ReviewItem, Subject } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useCountdown } from '../hooks/useCountdown';
import { formatClock } from '../utils/format';
import TimerRing from './TimerRing';
import { currentIntervalLabel, daysUntilDue, isOverdue, nextIntervalLabel } from '../utils/reviewAlgorithm';
import Icon from './Icon';

interface Props {
  duration: number; // minutos
  /** Próxima matéria da fila (null = última pausa). */
  nextSubject: Subject | null;
  /** Índice (1-based) desta pausa entre as pausas do sprint. */
  breakIndex: number;
  totalBreaks: number;
  /** Chamado ao zerar o tempo ou ao pular. */
  onDone: () => void;
  /** Pausa de revisão: os subtópicos pendentes, para marcar se acertou ou errou (a lista é a de quando a pausa começou). */
  review?: {
    items: ReviewItem[];
    onResult: (itemId: string, correct: boolean) => void;
  };
}

const BreakTimerView: React.FC<Props> = ({ duration, nextSubject, breakIndex, totalBreaks, onDone, review }) => {
  // A lista é a do começo da pausa: ao responder, o item sai das pendentes, mas continua na tela com o resultado.
  const [list] = useState(() => review?.items ?? []);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const answer = (item: ReviewItem, correct: boolean) => {
    if (item.id in answers) return;
    setAnswers(prev => ({ ...prev, [item.id]: correct }));
    review?.onResult(item.id, correct);
  };

  // Guarda contra chamada dupla (ex.: o tempo zerou e o usuário tocou em "Pular" no mesmo instante).
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useBackButton(finish);
  // Pequena espera antes de avançar para o "00:00" ser visto.
  const { secondsLeft, fraction } = useCountdown(duration * 60, () => { setTimeout(finish, 600); });

  // Só o conteúdo: a tela cheia (fundo opaco) é do SprintRunnerView (ver o comentário lá).
  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col items-center justify-between px-8 pb-8 animate-fade-in"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)' }}
    >
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon name={review ? 'bookmark' : 'mug-hot'} className={review ? 'text-amber-500 text-sm' : 'text-gray-400 dark:text-gray-600 text-sm'} />
          <span className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{review ? 'Pausa de revisão' : 'Pausa'}</span>
        </div>
        {totalBreaks > 1 && (
          <span className="text-xs font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">
            {breakIndex} / {totalBreaks}
          </span>
        )}
      </div>

      {review ? (
        <div className="w-full max-w-md flex-1 min-h-0 flex flex-col items-center gap-3 py-3">
          <div className="text-center shrink-0">
            <span className="text-5xl font-black text-gray-800 dark:text-white tabular-nums tracking-tighter">{formatClock(secondsLeft)}</span>
            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">de revisão</span>
          </div>
          <div className="w-full h-1 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(1 - fraction) * 100}%` }} />
          </div>

          {list.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
              <Icon name="circle-check" className="text-3xl text-green-500" />
              <p className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">Nenhuma revisão pendente</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[240px] leading-relaxed">
                Use esta pausa para descansar. Para criar revisões, ligue "Marcar pra revisar" no registro de um bloco.
              </p>
            </div>
          ) : (
            <ul data-testid="review-list" className="w-full flex-1 min-h-0 overflow-y-auto modal-scroll space-y-2">
              {list.map(item => {
                const done = item.id in answers;
                const late = isOverdue(item) ? -daysUntilDue(item) : 0;
                return (
                  <li key={item.id} data-testid="review-item" className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: item.subjectColor }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug">{item.subtopic}</p>
                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 leading-snug">
                          {item.subjectTitle} · {currentIntervalLabel(item)}
                          {late > 0 && <span className="text-amber-600 dark:text-amber-400"> · atrasada {late} {late === 1 ? 'dia' : 'dias'}</span>}
                        </p>
                      </div>
                    </div>
                    {done ? (
                      <p className={`text-[11px] font-black uppercase tracking-widest ${answers[item.id] ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        <Icon name={answers[item.id] ? 'circle-check' : 'rotate-left'} className="mr-1.5" />
                        {answers[item.id]
                          ? (nextIntervalLabel(item) === 'Consolidar' ? 'Acertou · consolidado!' : `Acertou · volta em ${nextIntervalLabel(item)}`)
                          : 'Errou · volta amanhã (D+1)'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => answer(item, true)}
                          aria-label={`Acertei: ${item.subtopic}`}
                          className="py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform"
                        >
                          Acertei
                        </button>
                        <button
                          onClick={() => answer(item, false)}
                          aria-label={`Errei: ${item.subtopic}`}
                          className="py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform"
                        >
                          Errei
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
      <div className="flex flex-col items-center gap-6">
        <TimerRing fraction={fraction} color="#9ca3af">
          <span className="text-6xl font-black text-gray-800 dark:text-white tabular-nums tracking-tighter">
            {formatClock(secondsLeft)}
          </span>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">de descanso</span>
        </TimerRing>

        {nextSubject ? (
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-full">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Próxima</span>
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: nextSubject.color }} />
            <span className="text-[11px] font-black uppercase tracking-tight" style={{ color: nextSubject.color }}>
              {nextSubject.title}
            </span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600">{nextSubject.duration}min</span>
          </div>
        ) : (
          <span className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">
            Última pausa do sprint
          </span>
        )}
      </div>
      )}

      <div className="w-full max-w-xs pb-12">
        <button
          onClick={finish}
          className="w-full py-4 text-gray-400 dark:text-gray-600 font-bold text-xs uppercase tracking-widest hover:text-indigo-500 transition-colors"
        >
          Pular pausa
        </button>
      </div>
    </div>
  );
};

export default BreakTimerView;
