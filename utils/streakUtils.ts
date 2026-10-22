/**
 * Ofensiva (streak) com dias bônus.
 *
 * REGRAS
 * - Um dia conta quando houve algum estudo nele (fuso local).
 * - A cada 7 dias de estudo seguidos → +1 dia bônus (máximo 3 guardados).
 * - Faltou exatamente 1 dia e há bônus → o bônus cobre a falta e a sequência continua.
 * - Faltaram 2+ dias, ou faltou 1 sem bônus → a sequência recomeça e os bônus zeram.
 * - A falta de ontem fica "em espera" até hoje: com bônus guardado a sequência continua viva
 *   (e o bônus já é considerado usado); sem bônus ela já se perdeu.
 * - O recorde (`longestStreak`) é o MAIOR valor que a sequência já teve (o pico do que o usuário viu),
 *   inclusive quando atravessou uma falta coberta por bônus.
 *
 * O cálculo percorre os dias em ORDEM CRONOLÓGICA, porque um bônus ganho numa semana é gasto
 * numa falta DEPOIS dela. (Percorrer de trás para frente só deixava um bônus cobrir faltas mais
 * antigas que a semana em que foi ganho: estudar 7 dias, faltar 1 e voltar zerava a sequência.)
 *
 * COPY: ofensiva é incentivo, nunca culpa. Todo texto derivado daqui segue esse filtro.
 */
import { addDays, daysBetween } from './dateUtils';
import { StreakState } from '../types';

export const MAX_BONUS = 3;
export const STUDY_DAYS_PER_BONUS = 7;

const EMPTY: StreakState = {
  currentStreak: 0,
  bonusBalance: 0,
  longestStreak: 0,
  totalStudyDays: 0,
  lastStudyDate: null,
  bonusUsedRecently: false,
};

/**
 * @param activeDayKeys dias com estudo ("YYYY-MM-DD")
 * @param today chave de hoje (injetada: o cálculo não lê o relógio)
 */
export function computeFullStreak(activeDayKeys: ReadonlySet<string>, today: string): StreakState {
  // Dias no futuro (relógio do aparelho foi voltado) não contam.
  const days = [...activeDayKeys].filter(d => d <= today).sort();
  if (days.length === 0) return { ...EMPTY };

  const yesterday = addDays(today, -1);
  let streak = 0;
  let bonus = 0;
  let sinceBonus = 0; // dias contados desde o último bônus ganho
  let usedRecently = false;
  let best = 0; // pico da sequência
  let prev: string | null = null;

  for (const day of days) {
    if (prev === null) {
      streak = 1;
      sinceBonus = 1;
    } else {
      const gap = daysBetween(prev, day);
      if (gap === 1) {
        streak++;
        sinceBonus++;
      } else if (gap === 2 && bonus > 0) {
        bonus--;
        streak++;
        sinceBonus++;
        const skipped = addDays(day, -1);
        if (skipped === today || skipped === yesterday) usedRecently = true;
      } else {
        streak = 1;
        sinceBonus = 1;
        bonus = 0;
      }
    }
    if (sinceBonus === STUDY_DAYS_PER_BONUS) {
      bonus = Math.min(bonus + 1, MAX_BONUS);
      sinceBonus = 0;
    }
    best = Math.max(best, streak);
    prev = day;
  }

  const lastStudyDate = prev as string;
  const sinceLast = daysBetween(lastStudyDate, today);

  let currentStreak = 0;
  let bonusBalance = 0;
  let bonusUsedRecently = false;
  if (sinceLast <= 1) {
    currentStreak = streak;
    bonusBalance = bonus;
    bonusUsedRecently = usedRecently;
  } else if (sinceLast === 2 && bonus > 0) {
    // Ontem ficou em branco; o bônus guardado já o cobre se o estudo voltar hoje.
    currentStreak = streak;
    bonusBalance = bonus - 1;
    bonusUsedRecently = true;
  }

  return {
    currentStreak,
    bonusBalance,
    longestStreak: Math.max(best, currentStreak),
    totalStudyDays: days.length,
    lastStudyDate,
    bonusUsedRecently,
  };
}

/** Ausente há 3+ dias, mas com histórico de uma sequência de 3+: mostra o "bem-vindo de volta". */
export function shouldShowWelcomeBack(state: StreakState, today: string): boolean {
  if (!state.lastStudyDate || state.currentStreak > 0) return false;
  return daysBetween(state.lastStudyDate, today) >= 3 && state.longestStreak >= 3;
}

/** Textos que nunca culpam. */
export function streakLabel(state: StreakState): string {
  if (state.currentStreak === 0) return 'Vamos começar!';
  if (state.currentStreak === 1) return '1 dia seguido';
  return `${state.currentStreak} dias seguidos`;
}

export function bonusLabel(balance: number): string {
  if (balance === 0) return 'Sem dias bônus';
  if (balance === 1) return '1 dia bônus guardado';
  return `${balance} dias bônus guardados`;
}

export function streakSubLabel(state: StreakState): string {
  if (state.currentStreak === 0) return 'Estude hoje para começar';
  if (state.currentStreak < 3) return 'Você está construindo o hábito';
  if (state.currentStreak < 7) return 'Bom ritmo! Continue assim';
  if (state.currentStreak < 30) return 'Ritmo consistente';
  return 'Disciplina de longo prazo';
}
