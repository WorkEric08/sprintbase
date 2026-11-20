import React from 'react';
import { createPortal } from 'react-dom';
import { RedacaoSession, RedacaoTheme } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useRedacaoWriter } from '../hooks/useRedacaoWriter';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';
import RedacaoScoringModal from './RedacaoScoringModal';
import RedacaoThemeBadges from './RedacaoThemeBadges';
import RedacaoTimerCard from './RedacaoTimerCard';

interface Props {
  theme: RedacaoTheme;
  /** Rascunho a continuar (só o cronômetro: no papel não há texto no app). */
  resume?: RedacaoSession;
  isDevMode: boolean;
  onSaveDraft: (draft: RedacaoSession) => void;
  onFinish: (session: RedacaoSession) => void;
  onClose: () => void;
}

/**
 * Escrever no papel: o app mostra o texto de apoio do tema e conta os 90 minutos; ao concluir, só o tempo e a nota
 * (que a pessoa dá a si mesma) são registrados. O cronômetro também vira rascunho, para voltar de onde parou.
 */
const RedacaoPaperView: React.FC<Props> = ({ theme, resume, isDevMode, onSaveDraft, onFinish, onClose }) => {
  const w = useRedacaoWriter({ theme, paper: true, resume, isDevMode, onSaveDraft, onFinish, onClose });
  useBackButton(() => w.setShowExit(true));

  return createPortal(
    <div data-testid="redacao-writer" role="dialog" aria-modal="true" aria-label="Redação no papel" className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 flex flex-col animate-fade-in">
      <RedacaoTimerCard
        remainingMs={w.remainingMs}
        running={w.running}
        hasStarted={w.hasStarted}
        onBack={() => w.setShowExit(true)}
        onStart={w.begin}
        onPause={w.pause}
        onFinish={w.finish}
      />

      <div className="flex-1 overflow-y-auto modal-scroll">
        <article className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <RedacaoThemeBadges theme={theme} extra={
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">Papel</span>
          } />
          <h1 className="text-xl md:text-2xl font-black text-gray-800 dark:text-gray-100 leading-tight">{theme.title}</h1>
          <div className="border-t border-amber-100 dark:border-gray-800" />
          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
            <Icon name="file-lines" className="mr-1" /> Texto de apoio
          </p>
          {theme.context ? (
            <p className="text-[15px] md:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{theme.context}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhum texto de apoio disponível para este tema.</p>
          )}
          <p className="text-center text-[11px] text-amber-700 dark:text-amber-400 font-bold pt-4">
            Toque em iniciar quando começar a escrever. Boa redação!
          </p>
        </article>
      </div>

      <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 pt-3 safe-bottom">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={w.finish}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.12em] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Icon name="check" />
            Concluir redação
          </button>
        </div>
      </div>

      {w.showScoring && (
        <RedacaoScoringModal
          onClose={w.backToWriting}
          onSave={(scores, notes) => w.save(scores, notes)}
          onSaveWithoutScore={notes => w.save(null, notes)}
        />
      )}

      {w.showExit && (
        <ConfirmDialog
          tone="warning"
          icon="pencil"
          title="Sair da redação?"
          confirmLabel="Sair e guardar"
          cancelLabel="Continuar"
          onConfirm={w.exit}
          onCancel={() => w.setShowExit(false)}
        >
          {w.hasStarted
            ? 'O tempo já usado fica guardado como rascunho, e você continua depois pela aba Redação.'
            : 'O cronômetro ainda não começou, então nada será guardado.'}
        </ConfirmDialog>
      )}
    </div>,
    document.body
  );
};

export default RedacaoPaperView;
