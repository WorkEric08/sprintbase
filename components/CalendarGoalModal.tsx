import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackButton } from '../hooks/useBackButton';
import { GoalLevel, GoalSettings, MAX_GOAL_LIMIT, MIN_GOAL_LIMIT, levelColor } from '../utils/calendar';
import Icon from './Icon';
import RangeSlider from './RangeSlider';

interface Props {
  current: GoalSettings;
  onSave: (goal: GoalSettings) => void;
  onClose: () => void;
}

const plural = (n: number) => (n === 1 ? 'bloco' : 'blocos');

/** Define o mínimo e o máximo de blocos por dia, que decidem as cores do calendário. */
const CalendarGoalModal: React.FC<Props> = ({ current, onSave, onClose }) => {
  useBackButton(onClose);
  const [min, setMin] = useState(current.min);
  const [max, setMax] = useState(current.max);

  // Mantém min < max: mexer em um empurra o outro.
  const changeMin = (v: number) => {
    setMin(v);
    if (v >= max) setMax(Math.min(v + 1, MAX_GOAL_LIMIT));
  };
  const changeMax = (v: number) => {
    setMax(v);
    if (v <= min) setMin(Math.max(v - 1, 1));
  };

  const rows: { level: GoalLevel; label: string; range: string }[] = [
    { level: 'below', label: 'Início', range: `1–${min - 1} ${plural(min - 1)}` },
    { level: 'partial', label: 'Parcial', range: `${min}–${max - 1} ${plural(max - 1)}` },
    { level: 'full', label: 'Meta!', range: `${max}+ ${plural(max)}` },
  ];
  const legend = rows.filter(r => r.level !== 'below' || min > 1);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-5 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div role="dialog" aria-label="Meta de blocos" className="relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm border border-gray-100 dark:border-gray-800 shadow-2xl animate-pop-in overflow-hidden max-h-[90vh] overflow-y-auto modal-scroll">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Meta de blocos</h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-0.5">Define as cores do calendário</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
            <Icon name="times" className="text-[11px]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="goal-min" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mínimo diário</label>
                <span className="text-sm font-black text-violet-600 dark:text-violet-400">{min} {plural(min)}</span>
              </div>
              <RangeSlider id="goal-min" min={1} max={MIN_GOAL_LIMIT} value={min} onChange={changeMin} color="#7c3aed" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="goal-max" className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Máximo diário</label>
                <span className="text-sm font-black text-violet-800 dark:text-violet-300">{max} {plural(max)}</span>
              </div>
              <RangeSlider id="goal-max" min={1} max={MAX_GOAL_LIMIT} value={max} onChange={changeMax} color="#5b21b6" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Legenda</p>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800/50 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Sem estudo</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-600">0 blocos</p>
              </div>
            </div>
            {legend.map(r => (
              <div key={r.level} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg shrink-0" style={{ backgroundColor: levelColor(r.level) }} />
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{r.label}</p>
                  <p className="text-[9px] text-gray-400 dark:text-gray-600">{r.range}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { onSave({ min, max }); onClose(); }}
            className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] text-white active:scale-[0.98] transition-all"
            style={{ backgroundColor: '#7c3aed' }}
          >
            Salvar meta
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalendarGoalModal;
