import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RedacaoSession, RedacaoTheme } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { useRedacaoWriter } from '../hooks/useRedacaoWriter';
import { WORDS_MAX, WORDS_MIN, wordStatus } from '../utils/redacao';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';
import RedacaoScoringModal from './RedacaoScoringModal';
import RedacaoSupportSheet from './RedacaoSupportSheet';
import RedacaoThemeBadges from './RedacaoThemeBadges';
import RedacaoTimerCard from './RedacaoTimerCard';

interface Props {
  theme: RedacaoTheme;
  /** Rascunho a continuar. */
  resume?: RedacaoSession;
  isDevMode: boolean;
  onSaveDraft: (draft: RedacaoSession) => void;
  onFinish: (session: RedacaoSession) => void;
  onClose: () => void;
}

const STATUS_TEXT = { short: 'Muito curto', ideal: 'Tamanho ideal', long: 'Muito longo' } as const;

/**
 * Escrever no próprio app. Tela cheia e opaca (as camadas de baixo nunca aparecem), com o cronômetro de 90 minutos
 * sempre à vista e o texto salvo sozinho (ver useRedacaoWriter). O campo é NÃO controlado: o texto vive no próprio
 * campo, então o teclado, a autocorreção e a composição de palavras (IME) do celular nunca brigam com a interface.
 */
const RedacaoEditorView: React.FC<Props> = ({ theme, resume, isDevMode, onSaveDraft, onFinish, onClose }) => {
  const w = useRedacaoWriter({ theme, paper: false, resume, isDevMode, onSaveDraft, onFinish, onClose });
  const [showSupport, setShowSupport] = useState(false);
  const keyboardOpen = useKeyboardVisible();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useBackButton(() => w.setShowExit(true));

  // O campo cresce com o texto e a tela rola (o título do tema fica acima, na mesma rolagem).
  const grow = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(grow, []);

  const status = wordStatus(w.words);

  return createPortal(
    <div data-testid="redacao-writer" role="dialog" aria-modal="true" aria-label="Escrever redação" className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 flex flex-col animate-fade-in">
      <RedacaoTimerCard
        remainingMs={w.remainingMs}
        running={w.running}
        hasStarted={w.hasStarted}
        onBack={() => w.setShowExit(true)}
        onStart={w.begin}
        onPause={w.pause}
        onFinish={w.finish}
        extra={
          <button
            onClick={() => setShowSupport(true)}
            aria-label="Apoio de escrita"
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center active:scale-90 transition-transform shrink-0"
          >
            <Icon name="list-check" className="text-xs" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto modal-scroll">
        <article className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <RedacaoThemeBadges theme={theme} />
          <h1 className="text-base md:text-lg font-black text-gray-800 dark:text-gray-100 leading-snug">{theme.title}</h1>
          <div className="border-t border-violet-100 dark:border-gray-800" />
          <label htmlFor="redacao-text" className="block text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">
            <Icon name="pen" className="mr-1" /> Sua redação
          </label>
          <textarea
            id="redacao-text"
            ref={areaRef}
            defaultValue={w.initialText}
            onInput={e => { w.onInput(e.currentTarget.value); grow(); }}
            placeholder={'Escreva sua redação aqui…\n\nIntrodução: apresente o tema e contextualize o problema.\nDesenvolvimento: dois argumentos com repertório sociocultural.\nConclusão: proposta de intervenção (agente, ação, modo, finalidade e detalhamento).'}
            lang="pt-BR"
            spellCheck
            autoCapitalize="sentences"
            autoCorrect="on"
            autoFocus
            className="w-full min-h-[45vh] text-base leading-7 text-gray-800 dark:text-gray-100 bg-transparent resize-none focus:outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 overflow-hidden"
          />
        </article>
      </div>

      {!keyboardOpen && (
        <div data-testid="redacao-footer" className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 px-4 pt-3 safe-bottom">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 leading-snug" aria-live="polite">
              <Icon name={status === 'ideal' ? 'circle-check' : 'triangle-exclamation'} className={`mr-1 ${status === 'ideal' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`} />
              <span data-testid="redacao-words">{w.words} palavras</span> · {STATUS_TEXT[status]}
              <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                ideal: {WORDS_MIN} a {WORDS_MAX} · {w.lastSavedAt ? 'rascunho salvo' : 'ainda sem salvar'}
              </span>
            </p>
            <button
              onClick={w.finish}
              className="shrink-0 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs uppercase tracking-[0.12em] active:scale-95 transition-all shadow-md flex items-center gap-2"
            >
              <Icon name="check" />
              Concluir
            </button>
          </div>
        </div>
      )}

      {showSupport && <RedacaoSupportSheet theme={theme} onClose={() => setShowSupport(false)} />}

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
          icon="pen"
          title="Sair da redação?"
          confirmLabel="Sair e guardar rascunho"
          cancelLabel="Continuar escrevendo"
          onConfirm={w.exit}
          onCancel={() => w.setShowExit(false)}
        >
          {w.words > 0 || resume
            ? 'O texto fica guardado como rascunho, com o tempo já usado, e você continua depois pela aba Redação.'
            : 'Você ainda não escreveu nada, então nenhum rascunho será guardado.'}
        </ConfirmDialog>
      )}
    </div>,
    document.body
  );
};

export default RedacaoEditorView;
