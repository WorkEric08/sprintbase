import React from 'react';
import { WRITING_MS, WRITING_MINUTES } from '../utils/redacao';
import Icon from './Icon';

interface Props {
  remainingMs: number;
  running: boolean;
  /** Já correu em algum momento (decide entre "Iniciar" e "Continuar"). */
  hasStarted: boolean;
  onBack: () => void;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  /** Botões extras à direita (ex.: apoio de escrita). */
  extra?: React.ReactNode;
}

function formatMS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const ROUND = 'w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0';

/** Barra do topo da escrita: voltar, cronômetro de 90 minutos, iniciar/pausar e concluir. */
const RedacaoTimerCard: React.FC<Props> = ({ remainingMs, running, hasStarted, onBack, onStart, onPause, onFinish, extra }) => {
  const progress = 1 - remainingMs / WRITING_MS;
  const color = remainingMs <= 10 * 60_000 ? '#ef4444' : remainingMs <= 30 * 60_000 ? '#d97706' : '#7c3aed';
  const status = remainingMs <= 0 ? 'Tempo esgotado' : running ? `Cronômetro · ${WRITING_MINUTES} min` : hasStarted ? 'Pausado' : 'Pronto para começar';

  return (
    <div className="shrink-0 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 px-4 pb-2 safe-top">
        <button onClick={onBack} aria-label="Voltar" className={`${ROUND} bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400`}>
          <Icon name="arrow-left" className="text-xs" />
        </button>

        <div className="flex-1 min-w-0 text-center" role="timer" aria-label={`${formatMS(remainingMs)} restantes`}>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{status}</p>
          <p data-testid="redacao-clock" className="text-3xl font-black tabular-nums leading-none" style={{ color }}>{formatMS(remainingMs)}</p>
        </div>

        {remainingMs > 0 && (
          <button
            onClick={running ? onPause : onStart}
            aria-label={running ? 'Pausar cronômetro' : hasStarted ? 'Continuar cronômetro' : 'Iniciar cronômetro'}
            className={`${ROUND} text-white shadow-md`}
            style={{ backgroundColor: color }}
          >
            <Icon name={running ? 'pause' : 'play'} className="text-xs" />
          </button>
        )}
        {extra}
        <button
          onClick={onFinish}
          aria-label="Concluir redação"
          className={`${ROUND} bg-violet-600 text-white shadow-md`}
        >
          <Icon name="check" className="text-xs" />
        </button>
      </div>
      <div className="h-1 bg-violet-100 dark:bg-violet-900/30">
        <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, progress * 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

export default RedacaoTimerCard;
