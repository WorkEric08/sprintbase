// Modelo de dados do Sprint. Mantido compatível com o app original:
// `Subject`, `CompletedBlock` e `BlockLog` têm o mesmo formato no banco `SprintDB`,
// para que módulos futuros (revisão, edital, banca...) possam voltar sem migração.

// ── Blocos ────────────────────────────────────────────────────────────────

export type BlockType = 'study' | 'review' | 'questions';

export const BLOCK_TYPES: BlockType[] = ['study', 'review', 'questions'];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  study: 'Estudo',
  review: 'Revisão',
  questions: 'Questões',
};

/** Cor do tipo de bloco. Em 'study' a UI usa a cor da própria matéria. */
export const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  study: '#6366f1',
  review: '#f59e0b',
  questions: '#22c55e',
};

export interface CompletedBlock {
  timestamp: number;
  type: BlockType;
}

// ── Matéria ───────────────────────────────────────────────────────────────

export interface Subject {
  id: string;
  title: string;
  color: string;
  /** Minutos por bloco. */
  duration: number;
  /** Meta de blocos. */
  blockCount: number;
  completedBlocks: CompletedBlock[];
  /** Mantém a ordem de criação (o original reordenava por id aleatório). Opcional p/ compatibilidade. */
  createdAt?: number;
}

export type SubjectInput = Pick<Subject, 'title' | 'color' | 'duration' | 'blockCount'>;

// ── Registro pós-bloco ────────────────────────────────────────────────────

export type SelfScore = 1 | 2 | 3 | 4 | 5;

export interface PostBlockData {
  questionsTotal: number;
  questionsCorrect: number;
  subtopic: string;
  selfScore: SelfScore;
}

export interface BlockLog {
  id: string;
  subjectId: string;
  subjectTitle: string;
  subjectColor: string;
  timestamp: number;
  questionsTotal: number;
  questionsCorrect: number;
  subtopic: string;
  selfScore: SelfScore;
  /** Reservado p/ revisão espaçada (módulo futuro). Sempre false na base. */
  flaggedForReview: boolean;
  blockType: BlockType;
  /** Reservado p/ desempenho por banca (módulo futuro). */
  banca?: string;
}

// ── Ofensiva (streak) ─────────────────────────────────────────────────────

/** Estado derivado (nunca gravado): calculado a partir dos dias em que houve estudo. */
export interface StreakState {
  /** Dias de estudo seguidos (dias bônus preenchem uma falta, mas não somam). */
  currentStreak: number;
  /** Dias bônus guardados (0–3). */
  bonusBalance: number;
  /** Maior sequência de dias consecutivos, sem contar bônus. */
  longestStreak: number;
  totalStudyDays: number;
  /** Último dia com estudo (YYYY-MM-DD, fuso local), se houver. */
  lastStudyDate: string | null;
  /** Um dia bônus cobriu ontem ou hoje: mostra o aviso acolhedor. */
  bonusUsedRecently: boolean;
}

// ── Sprint ────────────────────────────────────────────────────────────────

export type SprintItem =
  | { id: string; type: 'study'; subjectId: string; blockType: BlockType }
  | { id: string; type: 'break'; duration: number };
