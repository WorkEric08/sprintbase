import React from 'react';
import { createPortal } from 'react-dom';
import { useBackButton } from '../hooks/useBackButton';

interface Props {
  userName: string;
  /** Dias desde o último estudo. */
  daysAbsent: number;
  longestStreak: number;
  onDismiss: () => void;
}

/**
 * Aparece uma vez por dia quando a pessoa volta depois de 3+ dias, tendo já cumprido uma sequência.
 * COPY: acolhedor, sem culpa e sem falar do que "perdeu". O foco é o que vem agora.
 */
const WelcomeBackCard: React.FC<Props> = ({ userName, daysAbsent, longestStreak, onDismiss }) => {
  useBackButton(onDismiss);
  const firstName = userName.trim().split(' ')[0];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onDismiss} />

      <div
        role="dialog"
        aria-label="Bem-vindo de volta"
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4 mb-2 animate-slide-up"
      >
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto">
          <i className="fas fa-face-smile text-indigo-500 text-2xl" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
            Bem-vindo de volta{firstName ? `, ${firstName}` : ''}!
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {daysAbsent > 0
              ? `Faz ${daysAbsent} ${daysAbsent === 1 ? 'dia' : 'dias'} desde o último estudo. O importante é estar aqui agora.`
              : 'O importante é estar aqui. Vamos retomar onde paramos.'}
          </p>
          {longestStreak > 0 && (
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">
              Seu recorde: {longestStreak} dias seguidos — ainda é seu.
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] active:scale-[0.98] transition-transform shadow-lg shadow-indigo-500/20"
        >
          Vamos estudar
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-2 text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest"
        >
          Só estou olhando por agora
        </button>
      </div>
    </div>,
    document.body
  );
};

export default WelcomeBackCard;
