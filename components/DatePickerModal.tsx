import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackButton } from '../hooks/useBackButton';
import { todayKey } from '../utils/dateUtils';
import Icon from './Icon';

interface Props {
  /** "YYYY-MM-DD" atual, se houver. */
  value: string | null;
  onSelect: (date: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Seletor de data próprio (calendário). Nada do campo de data nativo do navegador: ele muda de um aparelho para outro. */
const DatePickerModal: React.FC<Props> = ({ value, onSelect, onClear, onClose }) => {
  useBackButton(onClose);
  const today = todayKey();
  const [ty, tm] = today.split('-').map(Number);
  const start = value ? value.split('-').map(Number) : [ty, tm];
  const [year, setYear] = useState(start[0]);
  const [month, setMonth] = useState(start[1] - 1);

  const step = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const NAV = 'w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 active:scale-90 transition-transform';

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div role="dialog" aria-label="Escolher data" className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-xs animate-pop-in overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button onClick={() => step(-1)} aria-label="Mês anterior" className={NAV}><Icon name="chevron-left" className="text-xs" /></button>
          <div className="text-center select-none" aria-live="polite">
            <p data-testid="datepicker-month" className="text-sm font-black text-gray-800 dark:text-gray-100 tracking-tight">{MONTHS[month]}</p>
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{year}</p>
          </div>
          <button onClick={() => step(1)} aria-label="Próximo mês" className={NAV}><Icon name="chevron-right" className="text-xs" /></button>
        </div>

        <div className="grid grid-cols-7 px-3 pb-2 border-b border-gray-50 dark:border-gray-800">
          {DAYS.map(d => (
            <div key={d} className="flex items-center justify-center py-1">
              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{d}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 px-3 py-3 gap-y-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const k = key(year, month, day);
            const selected = k === value;
            const isToday = k === today;
            return (
              <div key={k} className="flex items-center justify-center">
                <button
                  onClick={() => onSelect(k)}
                  aria-label={`${day} de ${MONTHS[month]} de ${year}`}
                  aria-pressed={selected}
                  className={`w-10 h-10 rounded-full text-sm transition-all active:scale-90 flex items-center justify-center relative ${
                    selected
                      ? 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/30'
                      : isToday
                        ? 'text-indigo-600 dark:text-indigo-400 font-black'
                        : 'text-gray-700 dark:text-gray-300 font-medium'
                  }`}
                >
                  {day}
                  {isToday && !selected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-500" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => onSelect(today)} className="py-2 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Hoje</button>
            {value && onClear && (
              <button onClick={onClear} className="py-2 text-[11px] font-black text-red-700 uppercase tracking-widest dark:text-red-400">Limpar</button>
            )}
          </div>
          <button onClick={onClose} className="py-2 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Cancelar</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DatePickerModal;
