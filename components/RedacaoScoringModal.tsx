import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RedacaoCompetencyScores } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { COMPETENCIES, EMPTY_SCORES, SCORE_STEPS, totalScore } from '../utils/redacao';
import { MAX_SCORE } from '../utils/redacaoStats';
import Icon from './Icon';

interface Props {
  /** Voltar ao texto sem salvar (botão voltar do aparelho, "Voltar" e toque fora). */
  onClose: () => void;
  /** Salva a redação concluída, com a autoavaliação. */
  onSave: (scores: RedacaoCompetencyScores, notes: string) => void;
  /** Salva a redação concluída SEM autoavaliação (aparece no histórico como "sem nota"). */
  onSaveWithoutScore: (notes: string) => void;
}

const LABEL = 'text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest';

/** Autoavaliação das 5 competências do ENEM (0–200 cada) ao concluir a redação. */
const RedacaoScoringModal: React.FC<Props> = ({ onClose, onSave, onSaveWithoutScore }) => {
  useBackButton(onClose);
  const [scores, setScores] = useState<RedacaoCompetencyScores>(EMPTY_SCORES);
  const [notes, setNotes] = useState('');
  const total = totalScore(scores);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end md:justify-center md:items-center md:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Autoavaliação"
        className="relative w-full md:max-w-2xl bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto modal-scroll animate-slide-up"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 pt-3 pb-3 px-5 z-10 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Autoavaliação</h3>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">Redação ENEM · 5 competências</p>
            </div>
            <button
              onClick={onClose}
              className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-violet-500 transition-colors px-2 py-1 shrink-0"
            >
              Voltar ao texto
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6 pb-8">
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 text-center border border-violet-100 dark:border-violet-900/30">
            <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest mb-1 dark:text-violet-400">Nota estimada</p>
            <p data-testid="redacao-total" className="text-4xl font-black text-violet-600 dark:text-violet-400">{total}</p>
            <p className="text-xs text-violet-600 dark:text-violet-300 mt-0.5">de {MAX_SCORE} pontos</p>
            <div className="mt-3 h-2 bg-violet-100 dark:bg-violet-900/40 rounded-full overflow-hidden max-w-[280px] mx-auto">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${(total / MAX_SCORE) * 100}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            <p className={LABEL}>Avalie cada competência (0–200)</p>
            {COMPETENCIES.map(c => (
              <div key={c.key} className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{c.label}: {c.title}</span>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{c.desc}</p>
                  </div>
                  <span className="text-base font-black text-violet-600 dark:text-violet-400 shrink-0 tabular-nums">{scores[c.key]}</span>
                </div>
                <div className="flex gap-1.5" role="group" aria-label={`Nota de ${c.label}`}>
                  {SCORE_STEPS.map(step => (
                    <button
                      key={step}
                      onClick={() => setScores(prev => ({ ...prev, [c.key]: step }))}
                      aria-pressed={scores[c.key] === step}
                      aria-label={`${c.label}: ${step}`}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 ${
                        scores[c.key] === step
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="redacao-notes" className={LABEL}>
              Observações <span className="font-normal normal-case tracking-normal opacity-60">(opcional)</span>
            </label>
            <textarea
              id="redacao-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="O que melhorar na próxima vez…"
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none focus:outline-none focus:border-violet-300 dark:focus:border-violet-700 transition-colors leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onSave(scores, notes)}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-violet-500/20"
            >
              <Icon name="check" />
              Salvar redação
            </button>
            <button
              onClick={() => onSaveWithoutScore(notes)}
              className="w-full py-3 text-gray-500 dark:text-gray-400 font-black text-[11px] uppercase tracking-widest hover:text-violet-500 transition-colors"
            >
              Salvar sem nota
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RedacaoScoringModal;
