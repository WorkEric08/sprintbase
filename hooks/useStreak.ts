import { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { StreakState } from '../types';
import { collectActiveDays } from '../utils/calendar';
import { isStreakEnabled } from '../utils/settings';
import { computeFullStreak } from '../utils/streakUtils';
import { useToday } from './useToday';

/** Ofensiva derivada dos dados ao vivo do contexto (nunca gravada) + "hoje" atualizado. */
export function useStreak(): { streak: StreakState; today: string; enabled: boolean } {
  const { subjects, blockLogs, settings } = useAppData();
  const today = useToday();
  const streak = useMemo(
    () => computeFullStreak(collectActiveDays(subjects, blockLogs), today),
    [subjects, blockLogs, today],
  );
  return { streak, today, enabled: isStreakEnabled(settings) };
}
