import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RedacaoTheme } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { CHECKLIST_ITEMS, COMPETENCIES } from '../utils/redacao';
import Icon from './Icon';

interface Props {
  theme: RedacaoTheme;
  onClose: () => void;
}

/** Apoio durante a escrita: texto de apoio do tema, as 5 competências e um checklist (as marcações não são guardadas). */
const RedacaoSupportSheet: React.FC<Props> = ({ theme, onClose }) => {
  useBackButton(onClose);
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());
  const toggle = (i: number) => setChecked(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end md:justify-center md:items-center md:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Apoio de escrita"
        className="relative w-full md:max-w-xl bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto modal-scroll animate-slide-up"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 pt-3 pb-3 px-5 z-10 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 md:hidden" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Apoio de escrita</h3>
            <button onClick={onClose} className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest hover:text-violet-500 px-2 py-1 shrink-0">
              Fechar
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5 pb-8">
          {theme.context && (
            <div className="bg-violet-50 dark:bg-violet-900/10 rounded-2xl p-4 border border-violet-100 dark:border-violet-900/30 space-y-1.5">
              <p className="text-[9px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest">Sobre o tema</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{theme.context}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">5 competências do ENEM</p>
            {COMPETENCIES.map(c => (
              <div key={c.key} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 space-y-0.5">
                <p className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{c.label}: {c.title}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Checklist de escrita</p>
            {CHECKLIST_ITEMS.map((item, i) => (
              <button
                key={item}
                onClick={() => toggle(i)}
                role="checkbox"
                aria-checked={checked.has(i)}
                className="w-full flex items-start gap-3 text-left p-2 rounded-xl active:bg-gray-50 dark:active:bg-gray-800/40"
              >
                <span className={`w-5 h-5 mt-0.5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                  checked.has(i) ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {checked.has(i) && <Icon name="check" className="text-white text-[9px]" />}
                </span>
                <span className={`text-xs leading-relaxed ${checked.has(i) ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>{item}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RedacaoSupportSheet;
