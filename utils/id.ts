/** Id curto e único o bastante para registros locais (mesmo formato do app original). */
export function uid(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
