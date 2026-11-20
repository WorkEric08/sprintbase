import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SimuladoAreaResult, SimuladoRecord, SimuladoSession } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { uid } from '../utils/id';
import { formatDuration } from '../utils/format';
import { Outcome } from '../utils/simulado';
import { PASS_PCT, pctOf } from '../utils/simuladoStats';
import Icon from './Icon';
import { legible } from '../utils/color';

interface Props {
  session: SimuladoSession;
  outcome: Outcome;
  /** Grava o registro com o gabarito preenchido. */
  onSave: (record: SimuladoRecord) => void;
  /** "Pular": grava só o tempo, sem gabarito, em vez de descartar o simulado. */
  onSkip: (record: SimuladoRecord) => void;
}

const TIME_CONTROL_LABELS: Record<number, string> = {
  1: 'Perdi o controle',
  2: 'Não administrei bem',
  3: 'Ok, podia melhorar',
  4: 'Administrei bem',
  5: 'Controle total',
};

const LABEL = 'text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest';
const STEP_BTN =
  'w-9 h-9 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 disabled:opacity-30 active:scale-90 transition-transform shrink-0 dark:text-gray-400';

const REDACAO = 'Redação';

type Field = 'questionsTotal' | 'questionsCorrect';

const toInt = (text: string): number => {
  const n = parseInt(text.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Folha de registro ao fim do simulado: acertos por área, controle do tempo e impressões.
 * "Pular" NÃO descarta nada: grava o simulado sem gabarito (aparece no histórico como "sem nota"), porque cinco horas de
 * prova não devem se perder por um toque no botão voltar.
 */
const PostSimuladoModal: React.FC<Props> = ({ session, outcome, onSave, onSkip }) => {
  const { template } = session;
  const [timeControl, setTimeControl] = useState<SimuladoRecord['timeControlScore']>(null);
  const [perception, setPerception] = useState('');
  const [redacaoScore, setRedacaoScore] = useState('');
  const [areas, setAreas] = useState<SimuladoAreaResult[]>(() =>
    // A redação não tem "questões": ela entra com nota própria (0–1000). Se contasse 1 questão errada, puxaria o
    // aproveitamento geral para baixo em todo ENEM Dia 1 (o app original fazia isso).
    template.areas.map(a => ({
      areaName: a.name, color: a.color, questionsTotal: a.name === REDACAO ? 0 : a.questionCount ?? 0, questionsCorrect: 0,
    })));

  const build = (areaResults: SimuladoAreaResult[], withNotes: boolean): SimuladoRecord => {
    const score = withNotes && redacaoScore !== '' ? Math.min(1000, toInt(redacaoScore)) : null;
    return {
      id: uid(),
      templateId: template.id,
      templateName: template.name,
      startedAt: session.startedAt,
      completedAt: session.endedAt ?? Date.now(),
      plannedDurationMinutes: template.durationMinutes,
      actualDurationMinutes: outcome.actualMinutes,
      completed: outcome.completed,
      areaResults,
      timeControlScore: withNotes ? timeControl : null,
      perception: withNotes ? perception.trim() : '',
      redacaoText: '',
      redacaoScore: score,
    };
  };

  const skip = () => onSkip(build(areas.map(a => ({ ...a, questionsTotal: 0, questionsCorrect: 0 })), false));
  useBackButton(skip);

  const setField = (idx: number, field: Field, value: number) =>
    setAreas(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const v = Math.max(0, value);
      return field === 'questionsTotal'
        ? { ...r, questionsTotal: v, questionsCorrect: Math.min(r.questionsCorrect, v) }
        : { ...r, questionsCorrect: Math.min(r.questionsTotal, v) };
    }));

  const totalCorrect = areas.reduce((s, r) => s + r.questionsCorrect, 0);
  const totalQuestions = areas.reduce((s, r) => s + r.questionsTotal, 0);
  const overall = pctOf(totalCorrect, totalQuestions);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end md:justify-center md:items-center md:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={skip} />

      <div
        role="dialog"
        aria-label="Registrar simulado"
        className="relative w-full md:max-w-2xl bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto modal-scroll animate-slide-up"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 pt-3 pb-3 px-5 z-10 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Registrar simulado</h3>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                {template.name} · {formatDuration(outcome.actualMinutes)}{!outcome.completed && ' (interrompido)'}
              </p>
            </div>
            <button
              onClick={skip}
              className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-indigo-500 transition-colors px-2 py-1 shrink-0"
            >
              Pular
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6 pb-8">
          {overall !== null && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 text-center border border-indigo-100 dark:border-indigo-900/30">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 dark:text-indigo-400">Aproveitamento geral</p>
              <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{overall}%</p>
              <p className="text-xs text-indigo-400 mt-0.5">{totalCorrect} de {totalQuestions} questões</p>
            </div>
          )}

          {areas.length > 0 && (
            <div className="space-y-3">
              <p className={LABEL}>Resultado por área</p>
              {areas.map((r, idx) => {
                const pct = pctOf(r.questionsCorrect, r.questionsTotal);
                const isRedacao = r.areaName === REDACAO;
                return (
                  <div key={r.areaName} className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 mt-1 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">{r.areaName}</span>
                      </div>
                      {pct !== null && !isRedacao && (
                        <span className="text-sm font-black shrink-0" style={{ color: legible(pct >= PASS_PCT ? '#16a34a' : '#ef4444') }}>{pct}%</span>
                      )}
                    </div>

                    {isRedacao ? (
                      <div className="flex items-center gap-3">
                        <label htmlFor="redacao-score" className="text-xs text-gray-500 dark:text-gray-400 flex-1">Nota (0–1000)</label>
                        <input
                          id="redacao-score"
                          type="text"
                          inputMode="numeric"
                          enterKeyHint="done"
                          value={redacaoScore}
                          onChange={e => setRedacaoScore(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                          placeholder="—"
                          className="w-24 text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-black text-gray-800 dark:text-gray-100 focus:outline-none focus:border-indigo-300"
                        />
                      </div>
                    ) : (
                      // Em telas estreitas (320 px) as duas caixas não cabem lado a lado sem espremer o número: uma sob a outra.
                      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
                        {([['Questões', 'questionsTotal'], ['Corretas', 'questionsCorrect']] as const).map(([label, field]) => (
                          <div key={field} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                            <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                            <div className="flex items-center justify-between gap-1">
                              <button
                                onClick={() => setField(idx, field, r[field] - 1)}
                                disabled={r[field] === 0}
                                className={STEP_BTN}
                                aria-label={`Menos uma: ${label} em ${r.areaName}`}
                              >
                                <Icon name="minus" className="text-[9px]" />
                              </button>
                              {/* Tocar no número permite digitar: 45 questões não cabem em 45 toques. */}
                              <input
                                type="text"
                                inputMode="numeric"
                                enterKeyHint="done"
                                aria-label={`${label} em ${r.areaName}`}
                                value={r[field]}
                                onFocus={e => e.currentTarget.select()}
                                onChange={e => setField(idx, field, toInt(e.target.value))}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                className="w-full min-w-0 text-center bg-transparent text-xl font-black text-gray-800 dark:text-white tabular-nums focus:outline-none"
                              />
                              <button
                                onClick={() => setField(idx, field, r[field] + 1)}
                                disabled={field === 'questionsCorrect' && r.questionsCorrect >= r.questionsTotal}
                                className={STEP_BTN}
                                aria-label={`Mais uma: ${label} em ${r.areaName}`}
                              >
                                <Icon name="plus" className="text-[9px]" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <p className={LABEL}>Controle do tempo</p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map(score => (
                <button
                  key={score}
                  onClick={() => setTimeControl(score)}
                  aria-pressed={timeControl === score}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 border-2 ${
                    timeControl === score
                      ? 'border-transparent bg-indigo-600 text-white shadow-md'
                      : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            {timeControl && (
              <p className="text-[11px] font-bold text-center text-gray-500 dark:text-gray-400">{TIME_CONTROL_LABELS[timeControl]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="simulado-perception" className={LABEL}>
              Como foi? <span className="font-normal normal-case tracking-normal opacity-60">(opcional)</span>
            </label>
            <textarea
              id="simulado-perception"
              value={perception}
              onChange={e => setPerception(e.target.value)}
              placeholder="Dificuldades, pontos de atenção, sensação geral…"
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-700 transition-colors"
            />
          </div>

          <button
            onClick={() => onSave(build(areas, true))}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-indigo-500/20"
          >
            <Icon name="check" />
            Salvar registro
          </button>
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 text-center leading-snug -mt-3">
            Pular guarda só o tempo, sem gabarito. O simulado fica no histórico.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PostSimuladoModal;
