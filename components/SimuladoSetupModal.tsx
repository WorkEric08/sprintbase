import React, { useState } from 'react';
import { SimuladoTemplate } from '../types';
import { CUSTOM_DURATIONS, SIMULADO_TEMPLATES } from '../data/simuladoTemplates';
import { formatDuration } from '../utils/format';
import { isNative } from '../utils/platform';
import { SPEEDS } from '../utils/simulado';
import Icon from './Icon';

interface Props {
  /** Modo desenvolvedor: oferece o tempo acelerado, para testar os avisos sem esperar 5 horas. */
  isDevMode: boolean;
  recordCount: number;
  onStart: (template: SimuladoTemplate, speed: number) => void;
  onOpenHistory: () => void;
}

const LABEL = 'text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest';
const ROUND_BTN =
  'w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 disabled:opacity-30 active:scale-90 transition-transform shrink-0 dark:text-gray-400';

/** Escolha do modelo de simulado. É o começo da aba; "Começar" inicia o cronômetro. */
const SimuladoSetupModal: React.FC<Props> = ({ isDevMode, recordCount, onStart, onOpenHistory }) => {
  const [selected, setSelected] = useState<SimuladoTemplate>(SIMULADO_TEMPLATES[0]);
  const [customDuration, setCustomDuration] = useState(180);
  const [customStrict, setCustomStrict] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const isCustom = selected.id === 'custom';
  const template: SimuladoTemplate = isCustom
    ? { ...selected, durationMinutes: customDuration, strictMode: customStrict }
    : selected;

  const durationIdx = CUSTOM_DURATIONS.indexOf(customDuration);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={LABEL}>Modo foco máximo</p>
          <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Simulado</h2>
        </div>
        <button
          onClick={onOpenHistory}
          aria-label="Histórico de simulados"
          className="shrink-0 flex items-center gap-2 px-4 h-10 rounded-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
        >
          <Icon name="clock-rotate-left" />
          Histórico{recordCount > 0 && <span className="text-indigo-600 dark:text-indigo-400">{recordCount}</span>}
        </button>
      </div>

      <div className="space-y-2">
        <p className={LABEL}>Modelo</p>
        {SIMULADO_TEMPLATES.map(t => {
          const isSel = selected.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              role="radio"
              aria-checked={isSel}
              className={`w-full text-left p-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                isSel
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  isSel ? 'border-indigo-500 bg-indigo-500' : 'border-gray-200 dark:border-gray-700'
                }`}>
                  {isSel && <Icon name="check" className="text-white text-[9px]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 dark:text-gray-100 text-sm uppercase tracking-tight">{t.name}</p>
                  <div className="flex items-center gap-x-2 gap-y-0.5 mt-0.5 flex-wrap text-[10px] font-bold">
                    <span className="text-gray-500 dark:text-gray-400">{t.id === 'custom' ? 'Você escolhe a duração' : formatDuration(t.durationMinutes)}</span>
                    {t.strictMode && <span className="font-black text-red-700 uppercase tracking-widest dark:text-red-400">· Estrito</span>}
                    {t.hasRedacao && <span className="font-black text-violet-600 uppercase tracking-widest dark:text-violet-400">· Redação</span>}
                  </div>
                  {t.areas.length > 0 && (
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {t.areas.map(a => a.name).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {isCustom && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3">
            <button
              onClick={() => durationIdx > 0 && setCustomDuration(CUSTOM_DURATIONS[durationIdx - 1])}
              disabled={durationIdx <= 0}
              className={ROUND_BTN}
              aria-label="Diminuir duração"
            >
              <Icon name="minus" className="text-xs" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">Duração</p>
              <p className="text-xl font-black text-gray-800 dark:text-white leading-tight">{formatDuration(customDuration)}</p>
            </div>
            <button
              onClick={() => durationIdx < CUSTOM_DURATIONS.length - 1 && setCustomDuration(CUSTOM_DURATIONS[durationIdx + 1])}
              disabled={durationIdx >= CUSTOM_DURATIONS.length - 1}
              className={ROUND_BTN}
              aria-label="Aumentar duração"
            >
              <Icon name="plus" className="text-xs" />
            </button>
          </div>

          <button
            onClick={() => setCustomStrict(v => !v)}
            role="switch"
            aria-checked={customStrict}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
              customStrict
                ? 'border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-900/10'
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              customStrict ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Icon name="lock" className={`text-xs ${customStrict ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className={`text-xs font-black uppercase tracking-tight ${customStrict ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                Modo estrito
              </p>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-tight">Sem pausas durante o simulado</p>
            </div>
            <div className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 ${customStrict ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${customStrict ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      )}

      {isDevMode && (
        <div className="space-y-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-3">
          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Modo desenvolvedor · velocidade</p>
          <div className="flex gap-2">
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`flex-1 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                  speed === s ? 'bg-amber-700 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-200 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                {s === 1 ? 'Normal' : `×${s}`}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/70 leading-snug">
            {speed === 1
              ? 'Tempo real.'
              : `${formatDuration(template.durationMinutes)} de prova passam em ${formatDuration(Math.ceil(template.durationMinutes / speed))} reais, e os avisos acompanham.`}
          </p>
        </div>
      )}

      <p className="flex items-start gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 leading-snug">
        <Icon name={isNative ? 'bell' : 'circle-info'} className="mt-0.5" />
        {isNative
          ? 'O app avisa quando faltar 1 hora, 30 minutos e 10 minutos e quando o tempo acabar, mesmo com a tela bloqueada, e mantém a tela ligada. O Android vai pedir permissão para notificações.'
          : 'No navegador os avisos de 1 hora, 30 e 10 minutos só aparecem com o app aberto. No aplicativo Android eles chegam também com a tela bloqueada.'}
      </p>

      <button
        onClick={() => onStart(template, isDevMode ? speed : 1)}
        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
      >
        <Icon name="play" />
        Começar · {formatDuration(template.durationMinutes)}
      </button>
    </div>
  );
};

export default SimuladoSetupModal;
