import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Subject } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useCountdown } from '../hooks/useCountdown';
import { formatClock } from '../utils/format';
import TimerRing from './TimerRing';

interface Props {
  duration: number; // minutos
  /** Próxima matéria da fila (null = última pausa). */
  nextSubject: Subject | null;
  /** Índice (1-based) desta pausa entre as pausas do sprint. */
  breakIndex: number;
  totalBreaks: number;
  /** Chamado ao zerar o tempo ou ao pular. */
  onDone: () => void;
}

const BreakTimerView: React.FC<Props> = ({ duration, nextSubject, breakIndex, totalBreaks, onDone }) => {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-between px-8 pb-8 animate-fade-in"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)' }}
    >
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2">
          <i className="fas fa-mug-hot text-gray-400 dark:text-gray-600 text-sm" />
          <span className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Pausa</span>
        </div>
        {totalBreaks > 1 && (
          <span className="text-xs font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">
            {breakIndex} / {totalBreaks}
          </span>
        )}
      </div>

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

      <div className="w-full max-w-xs pb-12">
        <button
          onClick={finish}
          className="w-full py-4 text-gray-400 dark:text-gray-600 font-bold text-xs uppercase tracking-widest hover:text-indigo-500 transition-colors"
        >
          Pular pausa
        </button>
      </div>
    </div>,
    document.body
  );
};

export default BreakTimerView;
