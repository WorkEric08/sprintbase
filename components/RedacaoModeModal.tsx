import React from 'react';
import { createPortal } from 'react-dom';
import { RedacaoTheme } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { WRITING_MINUTES } from '../utils/redacao';
import Icon from './Icon';
import RedacaoThemeBadges from './RedacaoThemeBadges';

interface Props {
  theme: RedacaoTheme;
  onChooseDigital: () => void;
  onChoosePaper: () => void;
  onBack: () => void;
}

/** Folha com o tema escolhido e a pergunta "como vai fazer a redação?": no próprio app ou no papel. */
const RedacaoModeModal: React.FC<Props> = ({ theme, onChooseDigital, onChoosePaper, onBack }) => {
  useBackButton(onBack);
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onBack} />

      <div
        role="dialog"
        aria-label="Como vai fazer a redação?"
        className="relative w-full md:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto modal-scroll animate-slide-up"
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 md:hidden" />

        <div className="px-6 pt-4 pb-4 space-y-2">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest py-1">
            <Icon name="arrow-left" className="text-[9px]" />
            Trocar tema
          </button>
          <RedacaoThemeBadges theme={theme} />
          <h2 className="text-base font-black text-gray-800 dark:text-gray-100 leading-snug">{theme.title}</h2>
        </div>

        <div className="px-6 pb-2">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Como vai fazer a redação?</p>
        </div>

        <div className="px-6 pb-5 pt-2 flex flex-col gap-3">
          <button
            onClick={onChooseDigital}
            className="w-full flex items-center gap-4 p-4 bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-800 rounded-2xl text-left active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 shrink-0 bg-violet-600 rounded-xl flex items-center justify-center shadow-md">
              <Icon name="laptop" className="text-white text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-800 dark:text-gray-100">Escrever aqui</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Editor com cronômetro de {WRITING_MINUTES} min, rascunho salvo sozinho e apoio das competências
              </p>
            </div>
          </button>

          <button
            onClick={onChoosePaper}
            className="w-full flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-2xl text-left active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 shrink-0 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
              <Icon name="pencil" className="text-white text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-800 dark:text-gray-100">Escrever no papel</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Mostra o texto de apoio do tema e conta o tempo enquanto você escreve à mão
              </p>
            </div>
          </button>
        </div>

        {theme.context && (
          <div className="px-6 pb-8 space-y-1.5">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sobre o tema</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">{theme.context}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default RedacaoModeModal;
