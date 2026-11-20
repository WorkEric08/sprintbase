import React, { useMemo, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { REDACAO_THEMES } from '../data/redacaoThemes';
import { useCompletedThemes } from '../hooks/useCompletedThemes';
import { RedacaoSession, RedacaoTheme } from '../types';
import { isDevModeUser } from '../utils/devMode';
import { formatDuration } from '../utils/format';
import { WRITING_MINUTES, isPaper, latestDraft } from '../utils/redacao';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';
import RedacaoEditorView from './RedacaoEditorView';
import RedacaoHistoryView from './RedacaoHistoryView';
import RedacaoModeModal from './RedacaoModeModal';
import RedacaoPaperView from './RedacaoPaperView';
import RedacaoSetupModal from './RedacaoSetupModal';
import UndoBar from './UndoBar';

type Phase =
  | { kind: 'pick' }
  | { kind: 'mode'; theme: RedacaoTheme }
  | { kind: 'write'; theme: RedacaoTheme; paper: boolean; resume?: RedacaoSession };

const THEME_BY_ID = new Map(REDACAO_THEMES.map(t => [t.id, t]));

/** O tema de um rascunho. Se ele saiu do banco de temas, usa o título gravado no próprio rascunho. */
const themeOf = (s: RedacaoSession): RedacaoTheme =>
  THEME_BY_ID.get(s.themeId) ?? { id: s.themeId, title: s.themeTitle, axis: 'treino', source: 'treino', verified: true };

const LABEL = 'text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest';

/**
 * Aba Redação: escolher o tema, escrever (no app ou no papel), continuar um rascunho e ver o histórico.
 * A escrita é uma tela cheia à parte (RedacaoEditorView / RedacaoPaperView); aqui ficam só as escolhas.
 */
const RedacaoView: React.FC = () => {
  const { userName, redacoes, saveRedacao, deleteRedacao } = useAppData();
  const { completedIds, markCompleted, replaceAll } = useCompletedThemes();
  const isDevMode = isDevModeUser(userName);

  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'discard' | null>(null);
  const [undo, setUndo] = useState<{ message: string; restore: () => void } | null>(null);

  const draft = useMemo(() => latestDraft(redacoes), [redacoes]);

  const backToPick = () => setPhase({ kind: 'pick' });

  const finish = (session: RedacaoSession) => {
    saveRedacao(session);
    if (session.completedAt !== null) markCompleted(session.themeId);
    backToPick();
  };

  const resume = (s: RedacaoSession) => {
    setHistoryOpen(false);
    setPhase({ kind: 'write', theme: themeOf(s), paper: isPaper(s), resume: s });
  };

  const resetCompleted = () => {
    const before = completedIds;
    replaceAll(new Set());
    setConfirm(null);
    setUndo({ message: 'Lista de feitas zerada', restore: () => replaceAll(before) });
  };

  const discardDraft = () => {
    if (!draft) return;
    deleteRedacao(draft.id);
    setConfirm(null);
    setUndo({ message: 'Rascunho descartado', restore: () => saveRedacao(draft) });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={LABEL}>{WRITING_MINUTES} min · rascunho salvo sozinho · 5 competências</p>
          <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Redação</h2>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          aria-label="Histórico de redações"
          className="shrink-0 flex items-center gap-2 px-4 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
        >
          <Icon name="clock-rotate-left" />
          Histórico{redacoes.length > 0 && <span className="text-violet-600 dark:text-violet-400">{redacoes.length}</span>}
        </button>
      </div>

      {draft && (
        <div data-testid="redacao-draft-banner" className="rounded-2xl border-2 border-violet-200 dark:border-violet-900/50 bg-violet-50 dark:bg-violet-900/10 p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">
              <Icon name="pen" className="mr-1" /> Rascunho em andamento{isPaper(draft) ? ' · papel' : ''}
            </p>
            <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug">{draft.themeTitle}</p>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
              {isPaper(draft) ? '' : `${draft.wordCount} palavras · `}{formatDuration(draft.durationMinutes)} de {WRITING_MINUTES} min usados
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => resume(draft)}
              className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform"
            >
              Continuar
            </button>
            <button
              onClick={() => setConfirm('discard')}
              className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <RedacaoSetupModal
        completedIds={completedIds}
        onPick={theme => setPhase({ kind: 'mode', theme })}
        onResetCompleted={() => setConfirm('reset')}
      />

      {phase.kind === 'mode' && (
        <RedacaoModeModal
          theme={phase.theme}
          onChooseDigital={() => setPhase({ kind: 'write', theme: phase.theme, paper: false })}
          onChoosePaper={() => setPhase({ kind: 'write', theme: phase.theme, paper: true })}
          onBack={backToPick}
        />
      )}

      {phase.kind === 'write' && (phase.paper ? (
        <RedacaoPaperView
          key={phase.resume?.id ?? phase.theme.id}
          theme={phase.theme}
          resume={phase.resume}
          isDevMode={isDevMode}
          onSaveDraft={saveRedacao}
          onFinish={finish}
          onClose={backToPick}
        />
      ) : (
        <RedacaoEditorView
          key={phase.resume?.id ?? phase.theme.id}
          theme={phase.theme}
          resume={phase.resume}
          isDevMode={isDevMode}
          onSaveDraft={saveRedacao}
          onFinish={finish}
          onClose={backToPick}
        />
      ))}

      {historyOpen && (
        <RedacaoHistoryView
          sessions={redacoes}
          onSave={saveRedacao}
          onDelete={deleteRedacao}
          onResume={resume}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {confirm === 'reset' && (
        <ConfirmDialog
          tone="warning"
          icon="rotate-left"
          title="Resetar as feitas?"
          confirmLabel="Sim, resetar"
          onConfirm={resetCompleted}
          onCancel={() => setConfirm(null)}
        >
          Os {completedIds.size} temas marcados como feitos voltam para os filtros normais. Nenhuma redação do histórico é apagada.
        </ConfirmDialog>
      )}

      {confirm === 'discard' && draft && (
        <ConfirmDialog
          icon="trash"
          title="Descartar o rascunho?"
          confirmLabel="Sim, descartar"
          onConfirm={discardDraft}
          onCancel={() => setConfirm(null)}
        >
          O texto de <span className="font-bold">{draft.themeTitle}</span> será removido. Logo depois você poderá desfazer.
        </ConfirmDialog>
      )}

      {undo && (
        <UndoBar
          aboveNav
          message={undo.message}
          onUndo={() => { undo.restore(); setUndo(null); }}
          onExpire={() => setUndo(null)}
        />
      )}
    </div>
  );
};

export default RedacaoView;
