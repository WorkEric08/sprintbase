import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BLOCK_TYPE_COLORS, BLOCK_TYPE_LABELS, BlockLog, BlockType, PostBlockData, Subject,
} from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useCountdown } from '../hooks/useCountdown';
import { formatClock } from '../utils/format';
import TimerRing from './TimerRing';
import PostBlockModal from './PostBlockModal';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  subject: Subject;
  blockType: BlockType;
  /** Posição do bloco entre os blocos de estudo do sprint (0-based). */
  cycleIndex: number;
  cycleTotal: number;
  blockLogs: BlockLog[];
  isDevMode: boolean;
  /** O tempo do bloco acabou: contabiliza 1 bloco concluído na matéria. */
  onComplete: () => void;
  onSaveLog: (data: PostBlockData) => void;
  /** Segue para o próximo item da fila. */
  onNext: () => void;
  /** Encerra o sprint inteiro. */
  onExit: () => void;
}

/** Registro mínimo: faz o bloco aparecer nas métricas mesmo sem o usuário preencher nada. */
const MINIMAL_LOG: PostBlockData = { questionsTotal: 0, questionsCorrect: 0, subtopic: '', selfScore: 3 };

const BlockTimerView: React.FC<Props> = ({
  subject, blockType, cycleIndex, cycleTotal, blockLogs, isDevMode,
  onComplete, onSaveLog, onNext, onExit,
}) => {
  const color = blockType === 'study' ? subject.color : BLOCK_TYPE_COLORS[blockType];
  const [showExit, setShowExit] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const wasRunningRef = useRef(false);
  const postTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { secondsLeft, fraction, isRunning, finished, pause, resume } = useCountdown(subject.duration * 60, () => {
    onComplete();
    // Mostra "Bloco concluído!" por um instante antes de pedir o registro.
    postTimeoutRef.current = setTimeout(() => setShowPost(true), 1500);
  });

  useEffect(() => () => {
    if (postTimeoutRef.current) clearTimeout(postTimeoutRef.current);
  }, []);

  const openExit = () => {
    wasRunningRef.current = isRunning;
    pause();
    setShowExit(true);
  };
  const closeExit = () => {
    setShowExit(false);
    if (wasRunningRef.current) resume();
  };

  const skipLog = () => {
    setShowPost(false);
    onSaveLog(MINIMAL_LOG);
    onNext();
  };

  const handleSkipBlock = () => {
    if (isDevMode) {
      onComplete();
      onSaveLog(MINIMAL_LOG);
    }
    onNext();
  };

  useBackButton(() => {
    if (showPost) skipLog();
    else if (!finished) openExit();
  });

  const done = subject.completedBlocks.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-white dark:bg-gray-950 flex flex-col items-center justify-between px-8 pb-8 animate-fade-in"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)' }}
    >
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ backgroundColor: color }} />
          <h2 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{subject.title}</h2>
          {blockType !== 'study' && (
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: color + '20', color }}
            >
              {BLOCK_TYPE_LABELS[blockType]}
            </span>
          )}
        </div>
        <span className="text-xs font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest shrink-0 ml-3">
          {cycleIndex + 1} / {cycleTotal}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6">
        <TimerRing fraction={fraction} color={color}>
          {finished ? (
            <div className="flex flex-col items-center animate-bounce">
              <i className="fas fa-check-circle text-6xl text-green-500 mb-2" />
              <span className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tighter">Bloco concluído!</span>
            </div>
          ) : (
            <>
              <span className="text-6xl font-black text-gray-800 dark:text-white tabular-nums tracking-tighter">
                {formatClock(secondsLeft)}
              </span>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">restantes</span>
            </>
          )}
        </TimerRing>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(subject.blockCount, 12) }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={i < Math.min(done, 12) ? { backgroundColor: color } : { border: `1.5px solid ${color}`, opacity: 0.3 }}
              />
            ))}
            {subject.blockCount > 12 && (
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 self-center ml-1">+{subject.blockCount - 12}</span>
            )}
          </div>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-600">{done}/{subject.blockCount}</span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3 pb-12">
        {!finished && (
          <>
            <button
              onClick={isRunning ? pause : resume}
              className="w-full py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 text-white"
              style={{ backgroundColor: color }}
            >
              <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play'}`} />
              {isRunning ? 'Pausar' : 'Retomar'}
            </button>
            <button
              onClick={handleSkipBlock}
              className="w-full py-4 text-gray-400 dark:text-gray-600 font-bold text-xs uppercase tracking-widest hover:text-indigo-500 transition-colors"
            >
              {cycleIndex + 1 < cycleTotal ? 'Pular → próximo bloco' : 'Pular → finalizar sprint'}
            </button>
            <button
              onClick={openExit}
              className="w-full py-3 text-gray-300 dark:text-gray-700 font-bold text-xs uppercase tracking-widest hover:text-red-400 transition-colors"
            >
              Encerrar sprint
            </button>
          </>
        )}
      </div>

      <div
        className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ backgroundColor: color }}
      />

      {showExit && (
        <ConfirmDialog
          icon="fa-triangle-exclamation"
          title="Encerrar sprint?"
          confirmLabel="Sim, encerrar"
          cancelLabel="Continuar estudando"
          onConfirm={onExit}
          onCancel={closeExit}
        >
          O tempo deste bloco <span className="font-bold text-red-500">não será contabilizado</span>.
        </ConfirmDialog>
      )}

      {showPost && (
        <PostBlockModal
          subjectId={subject.id}
          subjectTitle={subject.title}
          subjectColor={subject.color}
          blockLogs={blockLogs}
          onSubmit={data => {
            setShowPost(false);
            onSaveLog(data);
            onNext();
          }}
          onSkip={skipLog}
        />
      )}
    </div>,
    document.body
  );
};

export default BlockTimerView;
