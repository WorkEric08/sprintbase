import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useToday } from '../hooks/useToday';
import {
  DEFAULT_GOAL, GoalLevel, GoalSettings, MONTHS_COUNT, MONTH_NAMES,
  buildDayMap, buildMonthCells, formatDetailDate, formatShortDate, getGoalLevel, getMonthsToShow, isValidGoal, levelColor,
} from '../utils/calendar';
import { isDevModeUser } from '../utils/devMode';
import { SETTING_KEYS, isStringRecord, parseJsonSetting } from '../utils/settings';
import CalendarGoalModal from './CalendarGoalModal';

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NOTE_MAX = 500;

/** Modo dev: o que um toque num dia faz quando a simulação está ativa. */
type SimMode = 'paint' | 'today';
const SIM_CYCLE: GoalLevel[] = ['none', 'below', 'partial', 'full'];

/** Cor do número dentro da célula (as células coloridas usam o mesmo `levelColor` da legenda). */
function cellText(level: GoalLevel, isFuture: boolean): string {
  if (isFuture) return 'text-gray-200 dark:text-gray-800';
  switch (level) {
    case 'none': return 'text-gray-400 dark:text-gray-600';
    case 'below': return 'text-violet-900'; // fundo claro (#c4b5fd) nos dois temas
    default: return 'text-white';
  }
}

const HeatmapView: React.FC = () => {
  const { blockLogs, settings, userName, setSetting, removeSetting } = useAppData();
  const today = useToday();
  const isDevMode = isDevModeUser(userName);

  const goal = useMemo(
    () => parseJsonSetting<GoalSettings>(settings[SETTING_KEYS.calendarGoal], isValidGoal, DEFAULT_GOAL),
    [settings],
  );
  const dayNotes = useMemo(
    () => parseJsonSetting<Record<string, string>>(settings[SETTING_KEYS.dayNotes], isStringRecord, {}),
    [settings],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showGoal, setShowGoal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // ── Simulação (só modo dev): puramente visual, não toca no banco ──
  const [simEnabled, setSimEnabled] = useState(false);
  const [simMode, setSimMode] = useState<SimMode>('paint');
  const [simToday, setSimToday] = useState<string | null>(null);
  const [simLevels, setSimLevels] = useState<Record<string, GoalLevel>>({});
  const simActive = isDevMode && simEnabled;
  const effToday = simActive && simToday ? simToday : today;

  const cycleSimLevel = (dateKey: string) =>
    setSimLevels(prev => {
      const next = SIM_CYCLE[(SIM_CYCLE.indexOf(prev[dateKey] ?? 'none') + 1) % SIM_CYCLE.length];
      const copy = { ...prev };
      if (next === 'none') delete copy[dateKey];
      else copy[dateKey] = next;
      return copy;
    });

  // ── Dados ──
  const months = useMemo(() => getMonthsToShow(today), [today]);
  const monthsForDisplay = useMemo(() => [...months].reverse(), [months]); // mais antigo à esquerda
  const dayMap = useMemo(() => buildDayMap(blockLogs, months, today), [blockLogs, months, today]);

  const levelOf = (dateKey: string): GoalLevel => {
    const painted = simActive ? simLevels[dateKey] : undefined;
    if (painted) return painted;
    return getGoalLevel(dayMap.get(dateKey)?.blocks ?? 0, dateKey > effToday, goal);
  };

  // Começa mostrando o mês atual (o mais à direita).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, []);

  // Trocar de dia fecha a edição da anotação e carrega o texto salvo.
  useEffect(() => {
    setIsEditingNote(false);
    setNoteText(selectedKey ? dayNotes[selectedKey] ?? '' : '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const selected = selectedKey ? dayMap.get(selectedKey) ?? null : null;
  const selectedAccuracy = selected && selected.questions > 0 ? Math.round((selected.correct / selected.questions) * 100) : null;

  const saveGoal = (next: GoalSettings) => setSetting(SETTING_KEYS.calendarGoal, JSON.stringify(next));

  const saveNote = () => {
    if (!selectedKey) return;
    const updated = { ...dayNotes };
    const trimmed = noteText.trim();
    if (trimmed) updated[selectedKey] = trimmed;
    else delete updated[selectedKey];
    if (Object.keys(updated).length === 0) removeSetting(SETTING_KEYS.dayNotes);
    else setSetting(SETTING_KEYS.dayNotes, JSON.stringify(updated));
    setIsEditingNote(false);
  };

  const startEditNote = () => {
    setIsEditingNote(true);
    setTimeout(() => noteRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-4" data-testid="calendar">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 pt-4 mb-3">
          <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">
            Últimos {MONTHS_COUNT} meses
          </span>
          <button
            onClick={() => setShowGoal(true)}
            aria-label="Meta de blocos do calendário"
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600 hover:text-violet-500 active:scale-90 transition-all"
          >
            <i className="fas fa-gear text-[10px]" />
          </button>
        </div>

        {isDevMode && (
          <div className="mx-4 mb-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/70 bg-amber-50/60 dark:bg-amber-900/10 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <i className="fas fa-flask text-[10px]" /> Simulação (dev)
              </span>
              <button
                onClick={() => setSimEnabled(v => !v)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${
                  simEnabled ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                {simEnabled ? 'Ativo' : 'Inativo'}
              </button>
            </div>
            {simEnabled && (
              <>
                <div className="flex items-center gap-1.5">
                  {(['paint', 'today'] as SimMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setSimMode(m)}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                        simMode === m ? 'bg-amber-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {m === 'paint' ? 'Pintar cor' : 'Definir hoje'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold text-amber-600/80 dark:text-amber-500/80">
                    Hoje simulado: <span className="font-black">{simToday ? formatShortDate(simToday) : '—'}</span>
                  </span>
                  <button
                    onClick={() => { setSimToday(null); setSimLevels({}); }}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 active:scale-90 transition-transform"
                  >
                    Resetar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Faixa rolável na largura toda do cartão: o anel do "hoje" nunca é cortado pelo padding. */}
        <div ref={scrollRef} className="chips-scroll pb-1">
          <div className="flex gap-5 py-1">
            <div className="shrink-0 w-[14px]" aria-hidden="true" />
            {monthsForDisplay.map(({ year, month }) => {
              const cells = buildMonthCells(year, month);
              const activeDays = cells.filter(dk => dk && levelOf(dk) !== 'none').length;

              return (
                <div key={`${year}-${month}`} className="shrink-0 w-[220px]" data-month={`${year}-${String(month + 1).padStart(2, '0')}`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                      {MONTH_NAMES[month]}
                      <span className="text-gray-400 dark:text-gray-600 ml-1 font-bold">{year}</span>
                    </span>
                    {activeDays > 0 && (
                      <span className="text-[9px] font-black text-violet-400 dark:text-violet-500 uppercase tracking-widest">{activeDays}d</span>
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
                    {DAY_LABELS.map((label, i) => (
                      <div key={i} className="text-center text-[8px] font-black text-gray-300 dark:text-gray-700 uppercase">{label}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-[3px]">
                    {cells.map((dateKey, i) => {
                      if (!dateKey) return <div key={i} className="aspect-square" />;

                      const data = dayMap.get(dateKey);
                      const blocks = data?.blocks ?? 0;
                      const painted = simActive ? simLevels[dateKey] : undefined;
                      const isFuture = painted ? false : dateKey > effToday;
                      const isToday = dateKey === effToday;
                      const isSelected = selectedKey === dateKey;
                      const level = painted ?? getGoalLevel(blocks, isFuture, goal);
                      const day = parseInt(dateKey.split('-')[2], 10);

                      return (
                        <button
                          key={dateKey}
                          data-date={dateKey}
                          data-level={isFuture ? 'future' : level}
                          data-today={isToday ? 'true' : undefined}
                          aria-label={`${formatShortDate(dateKey)}: ${blocks} ${blocks === 1 ? 'bloco' : 'blocos'}`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            if (simActive) {
                              if (simMode === 'today') setSimToday(dateKey);
                              else cycleSimLevel(dateKey);
                              return;
                            }
                            if (isFuture || !data) return;
                            setSelectedKey(prev => (prev === dateKey ? null : dateKey));
                          }}
                          className={[
                            'aspect-square rounded-[5px] relative flex items-center justify-center transition-all duration-150',
                            isFuture ? 'bg-transparent' : level === 'none' ? 'bg-gray-100 dark:bg-gray-800/50' : '',
                            isToday && !isSelected ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 z-10' : '',
                            isSelected ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 scale-110 z-20' : '',
                            !isFuture || simActive ? 'active:scale-90' : 'cursor-default',
                          ].join(' ')}
                          style={!isFuture && level !== 'none' ? { backgroundColor: levelColor(level) } : undefined}
                        >
                          <span className={`text-[10px] font-bold leading-none select-none ${cellText(level, isFuture)}`}>{day}</span>
                          {dayNotes[dateKey] && !isFuture && (
                            <span
                              className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full"
                              style={{ backgroundColor: level === 'none' ? '#a78bfa' : 'rgba(255,255,255,0.75)' }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="shrink-0 w-[14px]" aria-hidden="true" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-4 mt-2 justify-end">
          <span className="text-[8px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest mr-1">Meta</span>
          {(['below', 'partial', 'full'] as GoalLevel[]).map(level => (
            <div key={level} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: levelColor(level) }} />
          ))}
          <div className="w-3 h-3 rounded-[3px] bg-gray-100 dark:bg-gray-800/50" />
        </div>
      </div>

      {/* ── Detalhe do dia ── */}
      {selected && !selected.isFuture && (
        <div className="animate-slide-up" data-testid="day-detail" data-date={selected.dateKey}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="h-[3px] w-full" style={{ backgroundColor: levelColor(getGoalLevel(selected.blocks, false, goal)) }} />
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  {selected.isToday && <span className="inline-block text-[9px] font-black text-violet-500 uppercase tracking-widest mb-0.5">Hoje</span>}
                  <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-snug capitalize">{formatDetailDate(selected.dateKey)}</p>
                </div>
                <button
                  onClick={() => setSelectedKey(null)}
                  aria-label="Fechar detalhe do dia"
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 active:scale-90 transition-all shrink-0 ml-3"
                >
                  <i className="fas fa-times text-[10px]" />
                </button>
              </div>

              {selected.blocks > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-violet-600 dark:text-violet-400 leading-none mb-1">{selected.blocks}</p>
                      <p className="text-[8px] font-black text-violet-400 dark:text-violet-600 uppercase tracking-widest">{selected.blocks === 1 ? 'Bloco' : 'Blocos'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-gray-700 dark:text-gray-200 leading-none mb-1">{selected.questions}</p>
                      <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Questões</p>
                    </div>
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{ backgroundColor: selectedAccuracy === null ? undefined : selectedAccuracy >= 70 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)' }}
                    >
                      <p
                        className="text-2xl font-black leading-none mb-1"
                        style={{ color: selectedAccuracy === null ? '#9ca3af' : selectedAccuracy >= 70 ? '#16a34a' : '#dc2626' }}
                      >
                        {selectedAccuracy !== null ? `${selectedAccuracy}%` : '—'}
                      </p>
                      <p
                        className="text-[8px] font-black uppercase tracking-widest"
                        style={{ color: selectedAccuracy === null ? '#9ca3af' : selectedAccuracy >= 70 ? '#16a34a' : '#dc2626', opacity: 0.7 }}
                      >
                        Acerto
                      </p>
                    </div>
                  </div>

                  {selected.questions > 0 && selectedAccuracy !== null && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${selectedAccuracy}%`, backgroundColor: selectedAccuracy >= 70 ? '#22c55e' : '#ef4444' }} />
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600">{selected.correct} de {selected.questions} corretas</p>
                    </div>
                  )}

                  {(() => {
                    const level = getGoalLevel(selected.blocks, false, goal);
                    const labels: Record<GoalLevel, string> = {
                      none: '',
                      below: `Abaixo do mínimo · meta: ${goal.min} blocos`,
                      partial: `Meta parcial · faltam ${goal.max - selected.blocks} para o máximo`,
                      full: 'Meta completa!',
                    };
                    if (level === 'none') return null;
                    return (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${levelColor(level)}22` }}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: levelColor(level) }} />
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: levelColor(level) }}>{labels[level]}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Anotação do dia (qualquer dia que não seja futuro) */}
              <div className={selected.blocks > 0 ? 'pt-1 border-t border-gray-100 dark:border-gray-800' : ''}>
                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      ref={noteRef}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Anote algo sobre esse dia…"
                      maxLength={NOTE_MAX}
                      rows={3}
                      className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus:outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setIsEditingNote(false); setNoteText(dayNotes[selected.dateKey] ?? ''); }}
                        className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-[0.98] transition-transform"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveNote}
                        className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-[0.98] transition-transform"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={startEditNote} className="w-full text-left" aria-label={dayNotes[selected.dateKey] ? 'Editar anotação' : 'Adicionar anotação'}>
                    {dayNotes[selected.dateKey] ? (
                      <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-violet-800 dark:text-violet-200 leading-relaxed whitespace-pre-wrap break-words" data-testid="day-note">
                          {dayNotes[selected.dateKey]}
                        </p>
                        <p className="text-[9px] font-black text-violet-400 dark:text-violet-600 uppercase tracking-widest mt-1.5">Toque para editar</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-gray-300 dark:text-gray-700 hover:text-violet-400 transition-colors">
                        <i className="fas fa-pen text-[9px]" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Adicionar anotação</span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGoal && <CalendarGoalModal current={goal} onSave={saveGoal} onClose={() => setShowGoal(false)} />}
    </div>
  );
};

export default HeatmapView;
