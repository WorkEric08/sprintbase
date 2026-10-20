import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import { Subject, SubjectInput } from '../types';
import { useBackButton } from '../hooks/useBackButton';

interface Props {
  /** Se informado, o formulário edita essa matéria; senão cria uma nova. */
  subject?: Subject;
  onSave: (data: SubjectInput) => void;
  onClose: () => void;
}

const PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6',
];

const LABEL = 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';

const SubjectFormView: React.FC<Props> = ({ subject, onSave, onClose }) => {
  useBackButton(onClose);
  const [title, setTitle] = useState(subject?.title ?? '');
  const [color, setColor] = useState(subject?.color ?? PALETTE[0]);
  const [duration, setDuration] = useState(subject?.duration ?? 25);
  const [blockCount, setBlockCount] = useState(subject?.blockCount ?? 20);
  const [customColor, setCustomColor] = useState(false);

  const canSave = title.trim().length > 0;
  const handleSave = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), color, duration, blockCount });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col animate-slide-up">
      <div className="flex items-center gap-3 px-4 pb-3 safe-top border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-transform"
        >
          <i className="fas fa-arrow-left text-sm" />
        </button>
        <h2 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">
          {subject ? 'Editar matéria' : 'Nova matéria'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto modal-scroll">
        <div className="max-w-lg mx-auto p-5 space-y-7">
          <div className="space-y-2">
            <label className={LABEL}>Nome</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex.: Matemática"
              maxLength={40}
              autoFocus={!subject}
              className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-700"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label className={LABEL}>Duração do bloco</label>
              <span className="text-sm font-black text-gray-800 dark:text-gray-100">{duration} min</span>
            </div>
            <input
              type="range" min={5} max={120} step={5}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label className={LABEL}>Meta de blocos</label>
              <span className="text-sm font-black text-gray-800 dark:text-gray-100">{blockCount} blocos</span>
            </div>
            <input
              type="range" min={1} max={100} step={1}
              value={blockCount}
              onChange={e => setBlockCount(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {Array.from({ length: Math.min(blockCount, 40) }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
              ))}
              {blockCount > 40 && (
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 self-center ml-1">
                  +{blockCount - 40}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className={LABEL}>Cor</label>
            <div className="flex flex-wrap gap-2.5">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setCustomColor(false); }}
                  aria-label={`Cor ${c}`}
                  className={`w-9 h-9 rounded-full transition-transform active:scale-90 ${
                    color === c && !customColor ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 ring-offset-gray-50 dark:ring-offset-gray-950' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={() => setCustomColor(v => !v)}
                aria-label="Escolher outra cor"
                className={`w-9 h-9 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 ${
                  customColor ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <i className="fas fa-palette text-xs" />
              </button>
            </div>
            {customColor && (
              <div className="flex items-center gap-4">
                <HexColorPicker color={color} onChange={setColor} />
                <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase">{color}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 safe-bottom border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
          >
            {subject ? 'Salvar alterações' : 'Adicionar matéria'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubjectFormView;
