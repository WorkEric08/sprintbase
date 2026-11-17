/**
 * Configurações estruturadas ficam na tabela `settings` (chave → texto) como JSON.
 * Aqui ficam as chaves e a leitura tolerante: valor ausente, corrompido ou de formato
 * inesperado (por exemplo vindo de um backup antigo) cai no padrão em vez de quebrar a tela.
 */

export const SETTING_KEYS = {
  streakEnabled: 'streak_enabled',   // 'true' | 'false' (ausente = ligado)
  calendarGoal: 'calendar_goal',     // JSON {min, max}
  dayNotes: 'day_notes',             // JSON { 'YYYY-MM-DD': 'texto' }
  welcomeBackShown: 'welcome_back_shown', // 'YYYY-MM-DD' do último "bem-vindo de volta"
  examDate: 'exam_date',             // 'YYYY-MM-DD' da prova
  selectedEdital: 'selected_edital_id', // 'enem' | 'custom' (ausente = nenhum)
  customEdital: 'custom_edital',     // JSON { name, subjects: [{ name, color }] }
  targetBanca: 'target_banca',       // uma das BANCAS (ausente = nenhuma)
  completedRedacaoThemes: 'completed_redacao_themes', // JSON ['enem-2022', ...]: temas de redação já feitos
  simuladoActive: 'simulado_active',      // JSON da sessão do simulado em andamento (ver utils/simulado.ts)
} as const;

export function parseJsonSetting<T>(raw: string | undefined, isValid: (v: unknown) => v is T, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export const isStringRecord = (v: unknown): v is Record<string, string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
  && Object.values(v).every(x => typeof x === 'string');

export const isStreakEnabled = (settings: Record<string, string>): boolean =>
  settings[SETTING_KEYS.streakEnabled] !== 'false';
