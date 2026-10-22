/**
 * Datas do calendário e da ofensiva. Tudo em fuso LOCAL, com o dia representado por uma
 * chave "YYYY-MM-DD" — nunca `toISOString().slice(0, 10)`, que usa UTC e erra o dia à noite.
 */

/** "YYYY-MM-DD" de um timestamp, no fuso local. */
export function toLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Chave de hoje (local). `now` é injetável para testes. */
export function todayKey(now: number = Date.now()): string {
  return toLocalDateKey(now);
}

/** Soma `days` dias corridos a uma chave. */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date.valueOf());
}

/** Diferença em dias corridos entre duas chaves (b − a). Imune a horário de verão. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86_400_000);
}
