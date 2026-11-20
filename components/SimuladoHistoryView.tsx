import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SimuladoRecord } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { formatDuration } from '../utils/format';
import { PASS_PCT, areaPct, averages, chartPoints, overallPct } from '../utils/simuladoStats';
import ConfirmDialog from './ConfirmDialog';
import EvolutionChart from './EvolutionChart';
import Icon from './Icon';
import UndoBar from './UndoBar';
import { legible } from '../utils/color';

interface Props {
  /** Do mais recente para o mais antigo. */
  records: SimuladoRecord[];
  /** Grava de novo um registro (usado para desfazer a exclusão). */
  onSave: (record: SimuladoRecord) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CARD = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800';
const CAPTION = 'text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest';

const scoreColor = (pct: number) => (pct >= PASS_PCT ? '#16a34a' : '#ef4444');

/** Histórico dos simulados: média, gráfico de evolução e linha do tempo com o detalhe de cada um. */
const SimuladoHistoryView: React.FC<Props> = ({ records, onSave, onDelete, onClose }) => {
  useBackButton(onClose);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<SimuladoRecord | null>(null);
  const [undo, setUndo] = useState<SimuladoRecord | null>(null);

  const points = useMemo(() => chartPoints(records), [records]);
  const avg = useMemo(() => averages(records), [records]);

  const remove = (record: SimuladoRecord) => {
    onDelete(record.id);
    setUndo(record);
    setConfirming(null);
    if (expanded === record.id) setExpanded(null);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Histórico de simulados" className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 flex flex-col animate-slide-up">
      <div className="flex items-center gap-3 px-4 pb-3 safe-top border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 active:scale-90 transition-transform"
        >
          <Icon name="arrow-left" className="text-sm" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Histórico de simulados</h2>
          <p className={CAPTION}>{records.length} {records.length === 1 ? 'simulado' : 'simulados'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto modal-scroll px-4 py-4 pb-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {records.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Icon name="stopwatch" className="text-gray-500 dark:text-gray-400 text-xl" />
              </div>
              <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nenhum simulado realizado</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] leading-relaxed">
                Os simulados que você fizer na aba Simulado aparecem aqui, com a evolução do aproveitamento.
              </p>
            </div>
          ) : (
            <>
              {avg && (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${CARD} p-4`}>
                    <p className={CAPTION}>Média (últimos 3)</p>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{avg.recent}%</p>
                    {avg.previous !== null && (
                      <p className={`text-[11px] font-bold mt-1 ${avg.recent > avg.previous ? 'text-green-700 dark:text-green-400' : avg.recent < avg.previous ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {avg.recent > avg.previous ? '↑' : avg.recent < avg.previous ? '↓' : '→'} vs {avg.previous}% anteriores
                      </p>
                    )}
                  </div>
                  <div className={`${CARD} p-4`}>
                    <p className={CAPTION}>Estimativa na prova</p>
                    <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">~{avg.recent}%</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Estimativa, não garantia</p>
                  </div>
                </div>
              )}

              {points.length > 1 && (
                <div className={`${CARD} p-4`}>
                  <p className={`${CAPTION} mb-2`}>Evolução</p>
                  <EvolutionChart points={points} />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Linha do tempo</p>
                {records.map(r => {
                  const pct = overallPct(r);
                  const open = expanded === r.id;
                  const date = new Date(r.completedAt);
                  return (
                    <div key={r.id} data-testid="simulado-record" className={`${CARD} overflow-hidden`}>
                      <div className="flex items-stretch">
                        <button
                          onClick={() => setExpanded(open ? null : r.id)}
                          aria-expanded={open}
                          className="flex-1 min-w-0 p-4 text-left flex items-center gap-3"
                        >
                          <div className="text-center shrink-0 w-12">
                            <p className="text-xs font-black text-gray-800 dark:text-gray-100">
                              {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </p>
                            <p className="text-[9px] text-gray-500 dark:text-gray-400">{date.getFullYear()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{r.templateName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">{formatDuration(r.actualDurationMinutes)}</span>
                              {!r.completed && (
                                <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                  Interrompido
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {pct !== null ? (
                              <>
                                <p className="text-xl font-black" style={{ color: legible(scoreColor(pct)) }}>{pct}%</p>
                                <p className="text-[9px] text-gray-500 dark:text-gray-400">aproveit.</p>
                              </>
                            ) : (
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">sem nota</p>
                            )}
                          </div>
                          <Icon name={open ? 'chevron-up' : 'chevron-down'} className="text-[10px] text-gray-500 dark:text-gray-400" />
                        </button>

                        <button
                          onClick={() => setConfirming(r)}
                          aria-label={`Excluir simulado de ${date.toLocaleDateString('pt-BR')}`}
                          className="w-12 flex items-center justify-center border-l border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-red-400 active:text-red-500 transition-colors shrink-0"
                        >
                          <Icon name="trash" className="text-[12px]" />
                        </button>
                      </div>

                      {open && (
                        <div className="border-t border-gray-50 dark:border-gray-800/60 px-4 pb-4 pt-3 space-y-3 animate-fade-in">
                          {r.areaResults.some(a => a.questionsTotal > 0) && (
                            <div className="space-y-2">
                              {r.areaResults.filter(a => a.questionsTotal > 0).map(a => {
                                const p = areaPct(a) ?? 0;
                                return (
                                  <div key={a.areaName}>
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                      <div className="flex items-start gap-1.5 min-w-0">
                                        <div className="w-2 h-2 mt-1.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400">{a.areaName}</span>
                                      </div>
                                      <span className="text-xs font-black shrink-0" style={{ color: legible(scoreColor(p)) }}>
                                        {a.questionsCorrect}/{a.questionsTotal} · {p}%
                                      </span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: a.color }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {r.redacaoScore !== null && (
                            <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Icon name="pen" className="text-[10px] text-violet-600 dark:text-violet-400" />
                              Redação: <strong className="text-violet-600 dark:text-violet-400">{r.redacaoScore}/1000</strong>
                            </p>
                          )}
                          {r.timeControlScore !== null && (
                            <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Icon name="clock" className="text-[10px] text-indigo-600 dark:text-indigo-400" />
                              Controle do tempo: <strong className="text-indigo-600 dark:text-indigo-400">{r.timeControlScore}/5</strong>
                            </p>
                          )}
                          {r.perception && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed border-l-2 border-gray-200 dark:border-gray-700 pl-3 whitespace-pre-wrap">
                              {r.perception}
                            </p>
                          )}
                          {!r.areaResults.some(a => a.questionsTotal > 0) && r.redacaoScore === null && r.timeControlScore === null && !r.perception && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Registrado sem gabarito: só o tempo foi guardado.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {undo && (
        <UndoBar
          message="Simulado excluído"
          onUndo={() => { onSave(undo); setUndo(null); }}
          onExpire={() => setUndo(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          icon="trash"
          title="Excluir simulado?"
          confirmLabel="Sim, excluir"
          onConfirm={() => remove(confirming)}
          onCancel={() => setConfirming(null)}
        >
          O registro de <span className="font-bold">{confirming.templateName}</span> de{' '}
          {new Date(confirming.completedAt).toLocaleDateString('pt-BR')} será removido. Logo depois você poderá desfazer.
        </ConfirmDialog>
      )}
    </div>,
    document.body
  );
};

export default SimuladoHistoryView;
