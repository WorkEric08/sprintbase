import { BlockLog } from '../types';
import { normalizeSubtopic } from './reviewAlgorithm';

/** Desempenho por subtópico e por banca, calculado dos registros de bloco. Funções puras. */

const pctOf = (correct: number, total: number) => Math.round((correct / total) * 100);

// ── Subtópicos ───────────────────────────────────────────────────────────

/** Questões mínimas para um subtópico entrar no ranking (menos que isso é ruído). */
export const MIN_SUBTOPIC_QUESTIONS = 3;

export interface SubtopicStat {
  subjectId: string;
  subjectTitle: string;
  subjectColor: string;
  subtopic: string;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  blocks: number;
}

/**
 * Acerto por subtópico (agrupado por matéria + subtópico, sem diferenciar maiúsculas). Registros SEM subtópico ficam de
 * fora: "(sem subtópico)" como ponto forte ou fraco não diz nada à pessoa.
 */
export function subtopicStats(blockLogs: BlockLog[]): SubtopicStat[] {
  const map = new Map<string, SubtopicStat>();
  for (const log of blockLogs) {
    if (!log.subtopic.trim() || log.questionsTotal <= 0) continue;
    const label = normalizeSubtopic(log.subtopic);
    const key = `${log.subjectId}::${label.toLowerCase()}`;
    const stat = map.get(key) ?? {
      subjectId: log.subjectId, subjectTitle: log.subjectTitle, subjectColor: log.subjectColor,
      subtopic: label, totalQuestions: 0, totalCorrect: 0, accuracy: 0, blocks: 0,
    };
    stat.totalQuestions += log.questionsTotal;
    stat.totalCorrect += log.questionsCorrect;
    stat.blocks += 1;
    // o título e a cor mais recentes da matéria (os registros chegam do mais novo para o mais antigo)
    map.set(key, stat);
  }
  return [...map.values()].map(s => ({ ...s, accuracy: pctOf(s.totalCorrect, s.totalQuestions) }));
}

export interface StrongWeak {
  strong: SubtopicStat[];
  weak: SubtopicStat[];
}

/** A partir deste acerto o subtópico é um ponto FORTE; abaixo, um ponto FRACO (o mesmo corte do verde nas telas). */
export const STRONG_MIN_PCT = 70;

/**
 * Até 5 pontos fortes (acerto ≥ 70%, do melhor para o pior) e até 5 fracos (abaixo de 70%, do pior para o melhor),
 * com mínimo de 3 questões por subtópico. Empate: o de mais questões primeiro. Cada subtópico entra em UMA lista só:
 * o app original listava os mesmos subtópicos nas duas quando havia poucos, e "ponto fraco" com 83% de acerto
 * não diz nada.
 */
export function strongAndWeak(blockLogs: BlockLog[], limit = 5): StrongWeak {
  const qualified = subtopicStats(blockLogs).filter(s => s.totalQuestions >= MIN_SUBTOPIC_QUESTIONS);
  const strong = qualified.filter(s => s.accuracy >= STRONG_MIN_PCT)
    .sort((a, b) => b.accuracy - a.accuracy || b.totalQuestions - a.totalQuestions);
  const weak = qualified.filter(s => s.accuracy < STRONG_MIN_PCT)
    .sort((a, b) => a.accuracy - b.accuracy || b.totalQuestions - a.totalQuestions);
  return { strong: strong.slice(0, limit), weak: weak.slice(0, limit) };
}

// ── Bancas ───────────────────────────────────────────────────────────────

/** Questões mínimas para uma banca aparecer. */
export const MIN_BANCA_QUESTIONS = 50;
/** Abaixo disto o acerto na banca alvo é dado como "abaixo do esperado". */
export const BANCA_TARGET_PCT = 65;

export interface BancaStat {
  banca: string;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  blockCount: number;
}

export function bancaStats(blockLogs: BlockLog[], minQuestions = MIN_BANCA_QUESTIONS): BancaStat[] {
  const map = new Map<string, { total: number; correct: number; blocks: number }>();
  for (const log of blockLogs) {
    if (!log.banca || log.questionsTotal <= 0) continue;
    const acc = map.get(log.banca) ?? { total: 0, correct: 0, blocks: 0 };
    acc.total += log.questionsTotal;
    acc.correct += log.questionsCorrect;
    acc.blocks += 1;
    map.set(log.banca, acc);
  }
  return [...map.entries()]
    .map(([banca, d]) => ({ banca, totalQuestions: d.total, totalCorrect: d.correct, accuracy: pctOf(d.correct, d.total), blockCount: d.blocks }))
    .filter(s => s.totalQuestions >= minQuestions)
    .sort((a, b) => b.totalQuestions - a.totalQuestions);
}

/** Questões já registradas numa banca (conte ou não o mínimo), para dizer quanto falta. */
export function bancaQuestionCount(blockLogs: BlockLog[], banca: string): number {
  return blockLogs.reduce((a, l) => a + (l.banca === banca ? l.questionsTotal : 0), 0);
}
