/** 125 → "2h 5m" · 60 → "1h" · 45 → "45m" · 0 → "—" */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/** 65 → "1h 5min" · 30 → "30min" (versão por extenso, usada no Montar Sprint) */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** 125 → "02:05" */
export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type Period = 'day' | 'week' | 'month';

/** Início (ms) do dia, da semana (segunda) ou do mês atual, em horário local. */
export function getPeriodStart(period: Period): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const dow = d.getDay(); // 0 = domingo
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  } else if (period === 'month') {
    d.setDate(1);
  }
  return d.getTime();
}
