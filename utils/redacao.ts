import { RedacaoCompetencyScores, RedacaoSession } from '../types';

/**
 * Regras do treino de redação, em funções puras (sem DOM, banco nem relógio): o rascunho, o cronômetro de escrita e a
 * nota. As telas só chamam isto.
 */

export const WRITING_MINUTES = 90;
export const WRITING_MS = WRITING_MINUTES * 60_000;

/** No modo papel as observações começam com isto (formato do app original, que a história usa para reconhecer o modo). */
export const PAPER_TAG = '[Modo papel]';

export const WORDS_MIN = 150;
export const WORDS_MAX = 500;

export const COMPETENCIES = [
  { key: 'c1', label: 'C1', short: 'Norma culta', title: 'Domínio da modalidade escrita', desc: 'Gramática, ortografia, pontuação e vocabulário.' },
  { key: 'c2', label: 'C2', short: 'Compreensão', title: 'Compreensão do tema', desc: 'Demonstrar domínio do tema sem fugir da proposta.' },
  { key: 'c3', label: 'C3', short: 'Argumentação', title: 'Seleção de argumentos', desc: 'Organizar informações e argumentos coerentes.' },
  { key: 'c4', label: 'C4', short: 'Coesão', title: 'Coesão e coerência', desc: 'Articular as partes do texto com mecanismos linguísticos.' },
  { key: 'c5', label: 'C5', short: 'Proposta', title: 'Proposta de intervenção', desc: 'Elaborar proposta detalhada, respeitando direitos humanos.' },
] as const;

/** Cada competência vale de 0 a 200, de 40 em 40 (como na correção oficial). */
export const SCORE_STEPS = [0, 40, 80, 120, 160, 200] as const;

export const CHECKLIST_ITEMS = [
  'Parágrafo introdutório com contextualização',
  'Pelo menos 2 argumentos com repertório',
  'Conectivos de coesão entre parágrafos',
  'Proposta de intervenção detalhada (C5)',
  'Agente, ação, modo e finalidade na proposta',
  'Revisão gramatical e ortográfica',
] as const;

export const EMPTY_SCORES: RedacaoCompetencyScores = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };

export const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

export type WordStatus = 'short' | 'ideal' | 'long';

export function wordStatus(words: number): WordStatus {
  return words < WORDS_MIN ? 'short' : words > WORDS_MAX ? 'long' : 'ideal';
}

export const totalScore = (s: RedacaoCompetencyScores): number => s.c1 + s.c2 + s.c3 + s.c4 + s.c5;

export const isDraft = (s: RedacaoSession): boolean => s.completedAt === null;
export const isPaper = (s: RedacaoSession): boolean => (s.notes ?? '').startsWith(PAPER_TAG);
/** Observações sem a marca do modo papel. */
export const plainNotes = (s: RedacaoSession): string => (isPaper(s) ? s.notes.slice(PAPER_TAG.length) : s.notes ?? '').trim();

// ── Cronômetro de escrita ────────────────────────────────────────────────

/**
 * Estado do cronômetro: tempo já acumulado + o instante em que voltou a correr (null = parado). O tempo decorrido é
 * sempre recalculado do horário real, então não congela com a tela apagada.
 */
export interface WritingClock {
  base: number;
  since: number | null;
}

export const clockStopped = (base = 0): WritingClock => ({ base, since: null });
export const clockStarted = (c: WritingClock, now: number): WritingClock => (c.since === null ? { ...c, since: now } : c);
export const clockStopAt = (c: WritingClock, now: number): WritingClock =>
  c.since === null ? c : { base: elapsedOf(c, now), since: null };

export function elapsedOf(c: WritingClock, now: number): number {
  return Math.min(WRITING_MS, c.base + (c.since === null ? 0 : Math.max(0, now - c.since)));
}

export const remainingOf = (c: WritingClock, now: number): number => WRITING_MS - elapsedOf(c, now);

// ── Rascunho e redação concluída ─────────────────────────────────────────

/** O que o editor sabe sobre a redação em andamento. */
export interface Writing {
  id: string;
  themeId: string;
  themeTitle: string;
  startedAt: number;
  text: string;
  elapsedMs: number;
  paper: boolean;
}

/** Rascunho: o que vai ao banco a cada salvamento automático. */
export function buildDraft(w: Writing, now: number): RedacaoSession {
  return {
    id: w.id,
    themeId: w.themeId,
    themeTitle: w.themeTitle,
    startedAt: w.startedAt,
    lastSavedAt: now,
    completedAt: null,
    durationMinutes: Math.round(w.elapsedMs / 60_000),
    text: w.text,
    wordCount: countWords(w.text),
    competencyScores: null,
    estimatedScore: null,
    notes: w.paper ? PAPER_TAG : '',
    elapsedMs: w.elapsedMs,
  };
}

/**
 * Redação concluída. `scores` null = salva sem nota (a pessoa não quis se autoavaliar). `forceFull` é o modo
 * desenvolvedor: conta os 90 minutos inteiros.
 */
export function buildFinished(
  w: Writing, scores: RedacaoCompetencyScores | null, notes: string, now: number, forceFull = false,
): RedacaoSession {
  const clean = notes.trim();
  return {
    id: w.id,
    themeId: w.themeId,
    themeTitle: w.themeTitle,
    startedAt: w.startedAt,
    lastSavedAt: now,
    completedAt: now,
    durationMinutes: forceFull ? WRITING_MINUTES : Math.round(Math.min(w.elapsedMs, WRITING_MS) / 60_000),
    text: w.paper ? '' : w.text,
    wordCount: w.paper ? 0 : countWords(w.text),
    competencyScores: scores,
    estimatedScore: scores ? totalScore(scores) : null,
    notes: w.paper ? (clean ? `${PAPER_TAG} ${clean}` : PAPER_TAG) : clean,
  };
}

/** Volta ao ponto onde o rascunho parou: o texto, o cronômetro PARADO no tempo salvo, o mesmo modo. */
export function writingFromDraft(s: RedacaoSession): Writing {
  return {
    id: s.id, themeId: s.themeId, themeTitle: s.themeTitle, startedAt: s.startedAt,
    text: s.text, elapsedMs: Math.min(WRITING_MS, s.elapsedMs ?? s.durationMinutes * 60_000), paper: isPaper(s),
  };
}

/** O rascunho mais recente (o último a ser salvo), se houver. */
export function latestDraft(sessions: RedacaoSession[]): RedacaoSession | null {
  return sessions.filter(isDraft).sort((a, b) => b.lastSavedAt - a.lastSavedAt)[0] ?? null;
}

// ── Temas já feitos (em settings, como JSON) ─────────────────────────────

export function parseCompleted(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export const serializeCompleted = (ids: ReadonlySet<string>): string => JSON.stringify([...ids]);
