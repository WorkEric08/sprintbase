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
  /**
   * Nome da matéria do edital a que esta matéria corresponde (definido ao aplicar o ENEM ou o edital personalizado).
   * Renomear a matéria no app NÃO quebra a cobertura do edital, que cruza por esta chave e não pelo nome atual.
   * Campo opcional, sem índice: não muda o schema do banco.
   */
  editalKey?: string;
}

export type SubjectInput = Pick<Subject, 'title' | 'color' | 'duration' | 'blockCount'>;

// ── Registro pós-bloco ────────────────────────────────────────────────────

export type SelfScore = 1 | 2 | 3 | 4 | 5;

export interface PostBlockData {
  questionsTotal: number;
  questionsCorrect: number;
  subtopic: string;
  selfScore: SelfScore;
  /** Banca das questões (opcional). */
  banca?: string | null;
  /** "Marcar pra revisar": cria (ou reinicia) a revisão espaçada deste subtópico. */
  flaggedForReview?: boolean;
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
  /** Marcado para revisão espaçada neste registro. */
  flaggedForReview: boolean;
  blockType: BlockType;
  /** Banca das questões deste bloco. */
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
  | { id: string; type: 'break'; duration: number }
  /** Pausa que também serve para revisar: lista os subtópicos pendentes e registra se acertou ou errou. */
  | { id: string; type: 'review-break'; duration: number };

// ── Simulado ──────────────────────────────────────────────────────────────
// Formato idêntico ao do app original (tabela `simuladoRecords`, v4 do banco): nada muda no schema.

export interface SimuladoArea {
  name: string;
  color: string;
  /** Total de questões da área na prova. */
  questionCount?: number;
}

export interface SimuladoTemplate {
  id: string;
  name: string;
  durationMinutes: number;
  /** Sem pausas livres. */
  strictMode: boolean;
  /** Mostra o campo de nota da redação no registro. */
  hasRedacao: boolean;
  areas: SimuladoArea[];
}

export interface SimuladoAreaResult {
  areaName: string;
  color: string;
  questionsTotal: number;
  questionsCorrect: number;
}

export interface SimuladoRecord {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: number;
  completedAt: number;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  /** false = encerrado antes do tempo. */
  completed: boolean;
  areaResults: SimuladoAreaResult[];
  /** Percepção de gestão do tempo (1–5). */
  timeControlScore: 1 | 2 | 3 | 4 | 5 | null;
  perception: string;
  redacaoText: string;
  /** Nota manual da redação, 0–1000. */
  redacaoScore: number | null;
}

/**
 * Simulado em andamento. Fica gravado em `settings` (chave `simulado_active`) para sobreviver a o Android matar o
 * processo durante as 5h30: o relógio é todo derivado de horários reais, então basta reabrir e recalcular.
 */
export interface SimuladoSession {
  /** Cópia do modelo no momento de começar (inclui a duração e o modo estrito escolhidos no "Customizado"). */
  template: SimuladoTemplate;
  startedAt: number;
  /** Quando a pausa atual começou; null = rodando. */
  pausedAt: number | null;
  /** Soma das pausas já encerradas, em ms. */
  pausedMs: number;
  /** Quando foi encerrado (acabou o tempo ou a pessoa encerrou); null = ainda em andamento. */
  endedAt: number | null;
  /** 1 = tempo real. Só o modo desenvolvedor usa mais que 1 (para testar os avisos sem esperar 5 horas). */
  speed: number;
}

// ── Redação ───────────────────────────────────────────────────────────────
// Formato do app original (tabela `redacaoSessions`, v5 do banco). Os campos opcionais são acréscimos que o original
// ignora, então os dados continuam indo e voltando entre as duas versões.

export interface RedacaoCompetencyScores {
  c1: number; // 0–200: domínio da modalidade escrita
  c2: number; // 0–200: compreensão do tema
  c3: number; // 0–200: seleção de informações e argumentos
  c4: number; // 0–200: coesão textual
  c5: number; // 0–200: proposta de intervenção
}

export type RedacaoThemeAxis =
  | 'meio-ambiente' | 'tecnologia' | 'sociedade' | 'saude'
  | 'educacao' | 'direitos' | 'economia' | 'cultura' | 'treino';

export interface RedacaoTheme {
  id: string;
  title: string;
  /** ENEM: ano da prova. */
  year?: number;
  axis: RedacaoThemeAxis;
  source: 'enem' | 'treino';
  /** false = título e ano ainda NÃO conferidos na fonte oficial (INEP). Curadoria manual: nunca preencher por IA. */
  verified: boolean;
  /** Texto de apoio para orientar a escrita. */
  context?: string;
}

export interface RedacaoSession {
  id: string;
  themeId: string;
  themeTitle: string;
  startedAt: number;
  lastSavedAt: number;
  /** null = rascunho (ainda não concluída). */
  completedAt: number | null;
  /** Minutos de escrita. */
  durationMinutes: number;
  text: string;
  wordCount: number;
  competencyScores: RedacaoCompetencyScores | null;
  /** Soma das competências (0–1000). */
  estimatedScore: number | null;
  /** No modo papel começa com "[Modo papel]". */
  notes: string;
  /** Só rascunhos: tempo de escrita acumulado até o último salvamento, para o cronômetro voltar de onde parou. */
  elapsedMs?: number;
}

// ── Revisão espaçada ──────────────────────────────────────────────────────
// Formato do app original (tabela `reviewItems`, v3 do banco).

/** Intervalos em dias: D+1 → D+3 → D+7 → D+15 → D+30 → D+60 → consolidado. */
export const REVIEW_INTERVALS = [1, 3, 7, 15, 30, 60] as const;

export interface ReviewItem {
  id: string;
  subjectId: string;
  subjectTitle: string;
  subjectColor: string;
  /** '(geral)' quando ficou em branco. */
  subtopic: string;
  createdAt: number;
  lastReviewedAt: number | null;
  /** Meia-noite local do dia da revisão. */
  nextReviewAt: number;
  /** 0–5: posição em REVIEW_INTERVALS. */
  intervalIndex: number;
  /** Passou do D+60. */
  consolidated: boolean;
  reviewCount: number;
}

// ── Banca ─────────────────────────────────────────────────────────────────

export const BANCAS = [
  'CESPE/CEBRASPE', 'FCC', 'FGV', 'VUNESP',
  'IBFC', 'Quadrix', 'IADES', 'Outra',
] as const;
export type Banca = typeof BANCAS[number];

// ── Edital ────────────────────────────────────────────────────────────────

export interface EditalSubtopic {
  name: string;
  /** Incidência histórica nas últimas 5 provas (0–100). 0 = não medido. */
  incidencia: number;
}

export interface EditalSubject {
  name: string;
  /** Peso relativo no edital (0–100). */
  weight: number;
  color: string;
  subtopics: EditalSubtopic[];
}

export interface Edital {
  id: string;
  name: string;
  organizer: string;
  category: 'enem' | 'federal' | 'estadual' | 'municipal' | 'custom';
  typicalMonth: string;
  /** Aviso sobre a precisão dos dados. */
  disclaimer: string;
  subjects: EditalSubject[];
}
