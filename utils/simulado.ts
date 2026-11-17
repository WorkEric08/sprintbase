import { SimuladoSession, SimuladoTemplate } from '../types';

/**
 * Relógio do simulado. Tudo aqui é função pura de (sessão, agora): nada guarda "quanto falta" em memória, então o
 * cronômetro continua certo com a tela apagada, com o app em segundo plano e até depois de o Android matar o processo.
 *
 * `speed` só passa de 1 no modo desenvolvedor: 12 faz as 5h30 do ENEM durarem uns 27 min reais, o bastante para
 * conferir os avisos com a tela bloqueada sem esperar o dia inteiro.
 */

export const MS_MINUTE = 60_000;

/** Avisos de tempo restante (valem em tempo de prova, não em tempo real). */
export const MILESTONES = [
  { id: 'h1', seconds: 3600, label: 'Falta 1 hora' },
  { id: 'm30', seconds: 1800, label: 'Faltam 30 minutos' },
  { id: 'm10', seconds: 600, label: 'Faltam 10 minutos' },
] as const;

export type Milestone = typeof MILESTONES[number];

/**
 * Avisos agendados no sistema = os 3 marcos + o FIM do tempo. O fim só existe como notificação: com a tela bloqueada
 * ninguém veria o relógio zerar, e dentro do app a folha de registro já abre sozinha.
 */
export const END_ALERT = { id: 'end', seconds: 0, label: 'O tempo acabou' } as const;
export const ALERTS = [...MILESTONES, END_ALERT] as const;
export type AlertId = typeof ALERTS[number]['id'];

export const SPEEDS = [1, 12, 60] as const;

export function createSession(template: SimuladoTemplate, now: number, speed = 1): SimuladoSession {
  return { template, startedAt: now, pausedAt: null, pausedMs: 0, endedAt: null, speed };
}

/** Instante que o relógio enxerga: congela na pausa e no fim. */
function clockNow(s: SimuladoSession, now: number): number {
  return Math.min(now, s.endedAt ?? now, s.pausedAt ?? now);
}

/** Tempo de prova já gasto, em ms (já com a aceleração do modo desenvolvedor). */
export function elapsedMs(s: SimuladoSession, now: number): number {
  const real = Math.max(0, clockNow(s, now) - s.startedAt - s.pausedMs);
  return real * s.speed;
}

export const plannedMs = (s: SimuladoSession): number => s.template.durationMinutes * MS_MINUTE;

export function remainingMs(s: SimuladoSession, now: number): number {
  return Math.max(0, plannedMs(s) - elapsedMs(s, now));
}

export const isPaused = (s: SimuladoSession): boolean => s.pausedAt !== null && s.endedAt === null;

/** O tempo acabou (ou a sessão foi encerrada): é hora do registro. */
export const isOver = (s: SimuladoSession, now: number): boolean => s.endedAt !== null || remainingMs(s, now) <= 0;

/** Pausa. Sem efeito no modo estrito, se já está pausado ou se já acabou. */
export function pauseSession(s: SimuladoSession, now: number): SimuladoSession {
  if (s.template.strictMode || s.pausedAt !== null || s.endedAt !== null) return s;
  return { ...s, pausedAt: now };
}

export function resumeSession(s: SimuladoSession, now: number): SimuladoSession {
  if (s.pausedAt === null || s.endedAt !== null) return s;
  return { ...s, pausedAt: null, pausedMs: s.pausedMs + Math.max(0, now - s.pausedAt) };
}

/** Marca o fim (por tempo esgotado ou por "Encerrar"). O instante do fim nunca passa do previsto. */
export function endSession(s: SimuladoSession, now: number): SimuladoSession {
  if (s.endedAt !== null) return s;
  const resumed = resumeSession(s, now);
  // Se o app só foi reaberto muito depois do fim previsto, o fim vale o instante em que o tempo realmente acabou.
  const naturalEnd = resumed.startedAt + resumed.pausedMs + plannedMs(resumed) / resumed.speed;
  return { ...resumed, endedAt: Math.min(now, naturalEnd) };
}

export interface Outcome {
  /** Minutos de prova usados (nunca mais que o planejado). */
  actualMinutes: number;
  completed: boolean;
}

/** Resultado de uma sessão encerrada. `forceComplete` é o "pular" do modo desenvolvedor. */
export function outcomeOf(s: SimuladoSession, forceComplete = false): Outcome {
  const planned = s.template.durationMinutes;
  if (forceComplete) return { actualMinutes: planned, completed: true };
  const end = s.endedAt ?? s.startedAt;
  const minutes = Math.min(planned, Math.round(elapsedMs(s, end) / MS_MINUTE));
  // -1: a aceleração do modo desenvolvedor divide e multiplica, e o ponto flutuante pode errar por frações de ms.
  return { actualMinutes: minutes, completed: elapsedMs(s, end) >= plannedMs(s) - 1 };
}

// ── Avisos ───────────────────────────────────────────────────────────────

export interface ScheduledAlert {
  id: AlertId;
  /** Instante REAL (ms desde 1970) em que o aviso deve tocar. */
  at: number;
  label: string;
}

/**
 * Avisos que ainda estão por vir, com o horário real de cada um. Sessão pausada ou encerrada = nenhum
 * (ao retomar, o agendamento é refeito com os novos horários). Avisos maiores que a prova inteira
 * (1 h numa prova de 30 min) nem entram.
 */
export function upcomingAlerts(s: SimuladoSession, now: number): ScheduledAlert[] {
  if (s.pausedAt !== null || s.endedAt !== null) return [];
  const left = remainingMs(s, now);
  return ALERTS
    .filter(m => left > m.seconds * 1000)
    .map(m => ({ id: m.id, label: m.label, at: now + (left - m.seconds * 1000) / s.speed }));
}

/**
 * Margem (em tempo REAL) para considerar que o aviso "acabou de passar" (e vale mostrar na tela) em vez de ter passado
 * com o app fechado. Com a aceleração do modo desenvolvedor ela vale `speed` vezes mais em tempo de prova.
 */
const FRESH_MS = 5000;

export interface AnnounceResult {
  /** Aviso a mostrar agora, se algum acabou de ser cruzado com o app aberto. */
  announce: Milestone | null;
  /** Conjunto atualizado dos avisos já tratados. */
  fired: Set<Milestone['id']>;
}

/**
 * Decide o aviso dentro do app. Cada um é tratado uma só vez; os que já tinham passado quando o app abriu
 * (o aviso já tocou como notificação) são marcados em silêncio, sem repetir na tela.
 */
export function milestonesToAnnounce(remaining: number, fired: ReadonlySet<Milestone['id']>, speed = 1): AnnounceResult {
  const next = new Set(fired);
  let announce: Milestone | null = null;
  for (const m of MILESTONES) {
    if (next.has(m.id) || remaining > m.seconds * 1000) continue;
    next.add(m.id);
    if (remaining >= m.seconds * 1000 - FRESH_MS * speed) announce = m; // o de menor tempo vence se vários cruzarem juntos
  }
  return { announce, fired: next };
}

// ── Persistência ─────────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function isTemplate(v: unknown): v is SimuladoTemplate {
  if (!isObject(v)) return false;
  return typeof v.id === 'string' && typeof v.name === 'string'
    && typeof v.durationMinutes === 'number' && v.durationMinutes > 0 && v.durationMinutes <= 24 * 60
    && typeof v.strictMode === 'boolean' && typeof v.hasRedacao === 'boolean'
    && Array.isArray(v.areas)
    && v.areas.every(a => isObject(a) && typeof a.name === 'string' && typeof a.color === 'string'
      && (a.questionCount === undefined || typeof a.questionCount === 'number'));
}

export function isSession(v: unknown): v is SimuladoSession {
  if (!isObject(v)) return false;
  return isTemplate(v.template) && isTime(v.startedAt) && isTime(v.pausedMs)
    && (v.pausedAt === null || isTime(v.pausedAt))
    && (v.endedAt === null || isTime(v.endedAt))
    && typeof v.speed === 'number' && v.speed >= 1 && v.speed <= 600;
}

/** Lê a sessão gravada em `settings`. Valor ausente ou estragado = sem simulado em andamento. */
export function parseSession(raw: string | undefined): SimuladoSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const serializeSession = (s: SimuladoSession): string => JSON.stringify(s);
