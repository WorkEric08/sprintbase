import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RedacaoSession } from '../types';
import { AXIS_COLORS, AXIS_LABELS, REDACAO_THEMES } from '../data/redacaoThemes';
import { useBackButton } from '../hooks/useBackButton';
import { COMPETENCIES, isDraft, isPaper, plainNotes } from '../utils/redacao';
import { MAX_SCORE, averages, chartPoints, competencyColor, competencySummary, scoreColor } from '../utils/redacaoStats';
import { formatDuration } from '../utils/format';
import ConfirmDialog from './ConfirmDialog';
import EvolutionChart from './EvolutionChart';
import Icon from './Icon';
import UndoBar from './UndoBar';

interface Props {
  /** Da mais recente para a mais antiga (rascunhos incluídos). */
  sessions: RedacaoSession[];
  /** Grava de novo uma redação (desfazer a exclusão). */
  onSave: (session: RedacaoSession) => void;
  onDelete: (id: string) => void;
  /** Continua um rascunho. */
  onResume: (session: RedacaoSession) => void;
  onClose: () => void;
}

const CARD = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800';
const CAPTION = 'text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';
const THEME_BY_ID = new Map(REDACAO_THEMES.map(t => [t.id, t]));

/** Histórico de redações: média, gráfico de evolução e linha do tempo (com os rascunhos, que dá para continuar). */
const RedacaoHistoryView: React.FC<Props> = ({ sessions, onSave, onDelete, onResume, onClose }) => {
  useBackButton(onClose);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<RedacaoSession | null>(null);
  const [undo, setUndo] = useState<RedacaoSession | null>(null);

  const points = useMemo(() => chartPoints(sessions), [sessions]);
  const avg = useMemo(() => averages(sessions), [sessions]);
  const byCompetency = useMemo(() => competencySummary(sessions), [sessions]);

  const remove = (s: RedacaoSession) => {
    onDelete(s.id);
    setUndo(s);
    setConfirming(null);
    if (expanded === s.id) setExpanded(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-gray-950 flex flex-col animate-slide-up">
      <div className="flex items-center gap-3 px-4 pb-3 safe-top border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          aria-label="Voltar"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-90 transition-transform"
        >
          <Icon name="arrow-left" className="text-sm" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">Histórico de redações</h2>
          <p className={CAPTION}>{sessions.length} {sessions.length === 1 ? 'redação' : 'redações'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto modal-scroll px-4 py-4 pb-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Icon name="pen" className="text-gray-300 dark:text-gray-600 text-xl" />
              </div>
              <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Nenhuma redação realizada</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 max-w-[240px] leading-relaxed">
                As redações que você fizer na aba Redação aparecem aqui, com a evolução da nota.
              </p>
            </div>
          ) : (
            <>
              {avg && (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${CARD} p-4`}>
                    <p className={CAPTION}>Média (últimas 3)</p>
                    <p className="text-3xl font-black text-violet-600 dark:text-violet-400 mt-1">{avg.recent}</p>
                    {avg.previous !== null ? (
                      <p className={`text-[11px] font-bold mt-1 ${avg.recent > avg.previous ? 'text-green-600' : avg.recent < avg.previous ? 'text-red-500' : 'text-gray-400'}`}>
                        {avg.recent > avg.previous ? '↑' : avg.recent < avg.previous ? '↓' : '→'} vs {avg.previous} anteriores
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">de {MAX_SCORE}</p>
                    )}
                  </div>
                  <div className={`${CARD} p-4`}>
                    <p className={CAPTION}>Melhor nota</p>
                    <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{avg.best}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">de {MAX_SCORE}</p>
                  </div>
                </div>
              )}

              {points.length > 1 && (
                <div className={`${CARD} p-4`}>
                  <p className={`${CAPTION} mb-2`}>Evolução</p>
                  <EvolutionChart points={points} max={MAX_SCORE} unit="" color="#8b5cf6" label="Evolução da nota nas redações" />
                </div>
              )}

              {byCompetency && (
                <div data-testid="redacao-competencias" className={`${CARD} p-4 space-y-3`}>
                  <p className={CAPTION}>
                    Por competência · {byCompetency.count === 1 ? 'última redação' : `últimas ${byCompetency.count} redações`}
                  </p>
                  {byCompetency.items.map(c => (
                    <div key={c.key}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-black text-violet-500 mr-1.5">{c.label}</span>{c.short}
                          {byCompetency.weakest?.key === c.key && (
                            <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-red-500">ponto fraco</span>
                          )}
                        </span>
                        <span className="text-xs font-black shrink-0" style={{ color: competencyColor(c.avg) }}>{c.avg}/200</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.avg / 200) * 100}%`, backgroundColor: competencyColor(c.avg) }} />
                      </div>
                    </div>
                  ))}
                  {byCompetency.weakest && (
                    <p className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3 text-xs font-bold leading-relaxed text-red-800 dark:text-red-300">
                      <Icon name="circle-exclamation" className="mt-0.5 shrink-0" />
                      <span>
                        Seu ponto fraco é {byCompetency.weakest.label} — {byCompetency.weakest.title} (média {byCompetency.weakest.avg}/200).
                        Foque em: {byCompetency.weakest.desc.toLowerCase()}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Linha do tempo</p>
                {sessions.map(s => {
                  const open = expanded === s.id;
                  const theme = THEME_BY_ID.get(s.themeId);
                  const draft = isDraft(s);
                  const paper = isPaper(s);
                  const date = new Date(s.completedAt ?? s.lastSavedAt);
                  const notes = plainNotes(s);
                  return (
                    <div key={s.id} data-testid="redacao-record" data-draft={draft} className={`${CARD} overflow-hidden`}>
                      <div className="flex items-stretch">
                        <button
                          onClick={() => setExpanded(open ? null : s.id)}
                          aria-expanded={open}
                          className="flex-1 min-w-0 p-4 text-left flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug">{s.themeTitle}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{date.toLocaleDateString('pt-BR')}</span>
                              {theme && (
                                <span
                                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: AXIS_COLORS[theme.axis] + '20', color: AXIS_COLORS[theme.axis] }}
                                >
                                  {AXIS_LABELS[theme.axis]}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDuration(s.durationMinutes)}</span>
                              {paper && <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Papel</span>}
                              {draft && <span className="text-[9px] font-black text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Rascunho</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {s.estimatedScore !== null ? (
                              <>
                                <p className="text-xl font-black" style={{ color: scoreColor(s.estimatedScore) }}>{s.estimatedScore}</p>
                                <p className="text-[9px] text-gray-400 dark:text-gray-500">de {MAX_SCORE}</p>
                              </>
                            ) : !draft && (
                              <p className="text-xs font-bold text-gray-400 dark:text-gray-500">sem nota</p>
                            )}
                          </div>
                          <Icon name={open ? 'chevron-up' : 'chevron-down'} className="text-[10px] text-gray-300 dark:text-gray-600" />
                        </button>

                        <button
                          onClick={() => setConfirming(s)}
                          aria-label={`Excluir redação: ${s.themeTitle}`}
                          className="w-12 flex items-center justify-center border-l border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 hover:text-red-400 active:text-red-500 transition-colors shrink-0"
                        >
                          <Icon name="trash" className="text-[12px]" />
                        </button>
                      </div>

                      {open && (
                        <div className="border-t border-gray-50 dark:border-gray-800/60 px-4 pb-4 pt-3 space-y-3 animate-fade-in">
                          {draft && (
                            <button
                              onClick={() => onResume(s)}
                              className="w-full py-3 bg-violet-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                            >
                              <Icon name="pen" />
                              Continuar este rascunho
                            </button>
                          )}

                          {s.competencyScores ? (
                            <div className="space-y-2">
                              <p className={CAPTION}>Autoavaliação · 5 competências</p>
                              {COMPETENCIES.map(c => {
                                const v = s.competencyScores![c.key];
                                return (
                                  <div key={c.key}>
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-black text-violet-500 mr-1.5">{c.label}</span>{c.short}
                                      </span>
                                      <span className="text-xs font-black shrink-0" style={{ color: competencyColor(v) }}>{v}/200</span>
                                    </div>
                                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${(v / 200) * 100}%`, backgroundColor: competencyColor(v) }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : !draft && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">Salva sem autoavaliação.</p>
                          )}

                          <p className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {!paper && <span className="flex items-center gap-1.5"><Icon name="pen" className="text-[10px] text-violet-500" />{s.wordCount} palavras</span>}
                            <span className="flex items-center gap-1.5"><Icon name="clock" className="text-[10px] text-violet-500" />{formatDuration(s.durationMinutes)}</span>
                          </p>

                          {notes && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed border-l-2 border-violet-200 dark:border-violet-900/40 pl-3 whitespace-pre-wrap">{notes}</p>
                          )}

                          {!paper && s.text && (
                            <details>
                              <summary className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest cursor-pointer py-1">
                                Ver texto da redação
                              </summary>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-2 whitespace-pre-wrap">{s.text}</p>
                            </details>
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
          message="Redação excluída"
          onUndo={() => { onSave(undo); setUndo(null); }}
          onExpire={() => setUndo(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          icon="trash"
          title="Excluir redação?"
          confirmLabel="Sim, excluir"
          onConfirm={() => remove(confirming)}
          onCancel={() => setConfirming(null)}
        >
          {isDraft(confirming) ? 'O rascunho' : 'A redação'} <span className="font-bold">{confirming.themeTitle}</span> será removida
          {confirming.text ? ', com todo o texto' : ''}. Logo depois você poderá desfazer.
        </ConfirmDialog>
      )}
    </div>,
    document.body
  );
};

export default RedacaoHistoryView;
