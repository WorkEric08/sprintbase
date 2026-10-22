import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BlockLog, PostBlockData, SelfScore } from '../types';
import Icon from './Icon';

interface Props {
  subjectId: string;
  subjectTitle: string;
  subjectColor: string;
  /** Registros existentes — usados só para sugerir subtópicos já digitados. */
  blockLogs: BlockLog[];
  onSubmit: (data: PostBlockData) => void;
  onSkip: () => void;
}

const SCORES: SelfScore[] = [1, 2, 3, 4, 5];
const SCORE_LABELS: Record<SelfScore, string> = { 1: 'Péssimo', 2: 'Ruim', 3: 'Ok', 4: 'Bom', 5: 'Ótimo' };
const SCORE_COLORS: Record<SelfScore, string> = {
  1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#6366f1',
};

const LABEL = 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';
const STEP_BTN =
  'w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 disabled:opacity-30 active:scale-90 transition-transform';

const PostBlockModal: React.FC<Props> = ({ subjectId, subjectTitle, subjectColor, blockLogs, onSubmit, onSkip }) => {
  const [selfScore, setSelfScore] = useState<SelfScore>(3);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [subtopic, setSubtopic] = useState('');

  // Subtópicos já usados nesta matéria, para sugestão rápida.
  const suggestions = useMemo(() => {
    const set = new Set(blockLogs.filter(l => l.subjectId === subjectId).map(l => l.subtopic).filter(Boolean));
    return [...set].sort();
  }, [blockLogs, subjectId]);

  const filtered = suggestions.filter(s => s !== subtopic && s.toLowerCase().includes(subtopic.toLowerCase()));

  const changeTotal = (delta: number) => {
    const next = Math.max(0, questionsTotal + delta);
    setQuestionsTotal(next);
    if (questionsCorrect > next) setQuestionsCorrect(next);
  };
  const changeCorrect = (delta: number) =>
    setQuestionsCorrect(prev => Math.min(questionsTotal, Math.max(0, prev + delta)));

  const accuracy = questionsTotal > 0 ? Math.round((questionsCorrect / questionsTotal) * 100) : null;
  const wrong = questionsTotal - questionsCorrect;

  const handleSubmit = () =>
    onSubmit({ questionsTotal, questionsCorrect, subtopic: subtopic.trim(), selfScore });

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end md:justify-center md:items-center md:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSkip} />

      <div className="relative w-full md:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto modal-scroll animate-slide-up">
        <div className="sticky top-0 bg-white dark:bg-gray-900 pt-3 pb-2 px-5 z-10 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 md:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
              <span className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight truncate">{subjectTitle}</span>
            </div>
            <button
              onClick={onSkip}
              className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest hover:text-indigo-500 transition-colors px-2 py-1 shrink-0"
            >
              Pular
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6 pb-8">
          {/* Autoavaliação */}
          <div className="space-y-2">
            <label className={LABEL}>Como você se saiu?</label>
            <div className="flex gap-2">
              {SCORES.map(score => (
                <button
                  key={score}
                  onClick={() => setSelfScore(score)}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 border-2 ${
                    selfScore === score
                      ? 'border-transparent text-white shadow-md'
                      : 'border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/40'
                  }`}
                  style={selfScore === score ? { backgroundColor: SCORE_COLORS[score] } : undefined}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-bold text-center" style={{ color: SCORE_COLORS[selfScore] }}>
              {SCORE_LABELS[selfScore]}
            </p>
          </div>

          {/* Questões */}
          <div className="space-y-2">
            <label className={LABEL}>Questões</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-2">Resolvidas</p>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => changeTotal(-1)} disabled={questionsTotal === 0} className={STEP_BTN} aria-label="Menos uma resolvida">
                    <Icon name="minus" className="text-[9px]" />
                  </button>
                  <span className="text-2xl font-black text-gray-800 dark:text-white tabular-nums">{questionsTotal}</span>
                  <button onClick={() => changeTotal(1)} className={STEP_BTN} aria-label="Mais uma resolvida">
                    <Icon name="plus" className="text-[9px]" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
                <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-2">Corretas</p>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => changeCorrect(-1)} disabled={questionsCorrect === 0} className={STEP_BTN} aria-label="Menos uma correta">
                    <Icon name="minus" className="text-[9px]" />
                  </button>
                  <span
                    className="text-2xl font-black tabular-nums"
                    style={{ color: accuracy === null ? undefined : accuracy >= 70 ? '#22c55e' : '#ef4444' }}
                  >
                    {questionsCorrect}
                  </span>
                  <button onClick={() => changeCorrect(1)} disabled={questionsCorrect >= questionsTotal} className={STEP_BTN} aria-label="Mais uma correta">
                    <Icon name="plus" className="text-[9px]" />
                  </button>
                </div>
              </div>
            </div>

            {accuracy !== null && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[11px] font-black" style={{ color: accuracy >= 70 ? '#22c55e' : '#ef4444' }}>
                  {accuracy}% de acerto
                </span>
                {wrong > 0 && (
                  <span className="text-[10px] font-bold text-red-400 dark:text-red-600">
                    · {wrong} {wrong === 1 ? 'erro' : 'erros'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subtópico */}
          <div className="space-y-2">
            <label className={LABEL}>
              Subtópico <span className="font-normal normal-case tracking-normal opacity-60">(opcional)</span>
            </label>
            <input
              type="text"
              value={subtopic}
              onChange={e => setSubtopic(e.target.value)}
              placeholder="Ex.: Funções, Direito Constitucional…"
              className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-700"
            />
            {filtered.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {filtered.slice(0, 6).map(s => (
                  <button
                    key={s}
                    onClick={() => setSubtopic(s)}
                    className="px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 active:scale-95 transition-transform"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-white shadow-lg"
            style={{ backgroundColor: subjectColor }}
          >
            <Icon name="check" />
            Salvar registro
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PostBlockModal;
