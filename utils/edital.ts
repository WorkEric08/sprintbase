import { BlockLog, Edital, Subject, SubjectInput } from '../types';
import { CUSTOM_ID, ENEM, ENEM_ID } from '../data/editais';

/**
 * Edital: qual está ativo, o personalizado, como as matérias do app se ligam às do edital e a cobertura.
 *
 * LIGAÇÃO MATÉRIA ↔ EDITAL. No app original a cobertura cruzava a matéria do app com a do edital PELO NOME, então
 * renomear a matéria quebrava tudo. Aqui cada matéria guarda `editalKey` (o nome da matéria do edital a que corresponde,
 * gravado ao aplicar o edital) e a cobertura cruza por essa chave; o nome só vale para matérias antigas que ainda não
 * têm chave. É um campo opcional da própria matéria: não muda o schema do banco, e o app original o ignora.
 */

// ── Edital personalizado ─────────────────────────────────────────────────

export interface CustomSubject {
  name: string;
  color: string;
}

export interface CustomEdital {
  name: string;
  subjects: CustomSubject[];
}

export const CUSTOM_NAME_MAX = 50;

function isCustomEdital(v: unknown): v is CustomEdital {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c.name === 'string' && Array.isArray(c.subjects)
    && c.subjects.every(s => typeof s === 'object' && s !== null
      && typeof (s as CustomSubject).name === 'string' && typeof (s as CustomSubject).color === 'string');
}

/** Lê o edital personalizado gravado em `settings`. Ausente ou estragado = nenhum. */
export function parseCustomEdital(raw: string | undefined): CustomEdital | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCustomEdital(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const serializeCustomEdital = (c: CustomEdital): string => JSON.stringify(c);

/** O edital personalizado como um `Edital` (sem subtópicos: a pessoa só nomeia as matérias). */
export function customToEdital(c: CustomEdital): Edital {
  return {
    id: CUSTOM_ID,
    name: c.name,
    organizer: 'Personalizado',
    category: 'custom',
    typicalMonth: '',
    disclaimer: 'Edital criado por você.',
    subjects: c.subjects.map(s => ({ name: s.name, weight: 0, color: s.color, subtopics: [] })),
  };
}

/** O edital ativo, a partir do que está em `settings`. */
export function resolveEdital(id: string | undefined, customRaw: string | undefined): Edital | null {
  if (id === ENEM_ID) return ENEM;
  if (id === CUSTOM_ID) {
    const custom = parseCustomEdital(customRaw);
    return custom ? customToEdital(custom) : null;
  }
  return null;
}

// ── Ligação matéria ↔ edital ─────────────────────────────────────────────

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * A matéria do app que corresponde à do edital: primeiro a que tem `editalKey` igual; senão, uma matéria SEM chave
 * (antiga) com o mesmo nome. Uma matéria que já tem chave de outra matéria do edital nunca é "roubada" pelo nome.
 */
export function matchSubject(subjects: Subject[], editalSubjectName: string): Subject | null {
  return subjects.find(s => s.editalKey !== undefined && same(s.editalKey, editalSubjectName))
    ?? subjects.find(s => s.editalKey === undefined && same(s.title, editalSubjectName))
    ?? null;
}

export const DEFAULT_EDITAL_BLOCK_MINUTES = 50;
const CUSTOM_BLOCKS = 20;

export interface ApplyPlan {
  /** Matérias que ainda não existem e serão criadas. */
  add: (SubjectInput & { editalKey: string })[];
  /** Matérias que já existem e só ganham a ligação com o edital. */
  link: { id: string; editalKey: string }[];
}

/** O que aplicar um edital faz: cria as matérias que faltam e liga as que já existem. */
export function planApply(edital: Edital, subjects: Subject[]): ApplyPlan {
  const plan: ApplyPlan = { add: [], link: [] };
  for (const es of edital.subjects) {
    const found = matchSubject(subjects, es.name);
    if (!found) {
      plan.add.push({
        title: es.name,
        color: es.color,
        duration: DEFAULT_EDITAL_BLOCK_MINUTES,
        blockCount: edital.category === 'enem' ? Math.max(10, Math.round(es.weight / 5)) : CUSTOM_BLOCKS,
        editalKey: es.name,
      });
    } else if (found.editalKey !== es.name) {
      plan.link.push({ id: found.id, editalKey: es.name });
    }
  }
  return plan;
}

// ── Cobertura ────────────────────────────────────────────────────────────

export interface SubjectCoverage {
  editalSubjectName: string;
  color: string;
  appSubject: Subject | null;
  /** Pelo menos 1 bloco concluído. */
  covered: boolean;
  subtopicsTotal: number;
  /** Subtópicos do edital que aparecem nos registros de bloco da matéria. */
  subtopicsCovered: number;
  untouchedSubtopics: string[];
}

export interface Coverage {
  subjects: SubjectCoverage[];
  coveredSubjects: number;
  subjectsPct: number;
  totalSubtopics: number;
  coveredSubtopics: number;
  subtopicsPct: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function computeCoverage(edital: Edital, subjects: Subject[], blockLogs: BlockLog[]): Coverage {
  const rows = edital.subjects.map<SubjectCoverage>(es => {
    const appSubject = matchSubject(subjects, es.name);
    const logged = new Set(
      (appSubject ? blockLogs.filter(l => l.subjectId === appSubject.id) : [])
        .map(l => l.subtopic.trim().toLowerCase())
        .filter(Boolean),
    );
    const covered = es.subtopics.filter(st => logged.has(st.name.trim().toLowerCase()));
    return {
      editalSubjectName: es.name,
      color: es.color,
      appSubject,
      covered: appSubject !== null && appSubject.completedBlocks.length > 0,
      subtopicsTotal: es.subtopics.length,
      subtopicsCovered: covered.length,
      untouchedSubtopics: es.subtopics.filter(st => !logged.has(st.name.trim().toLowerCase())).map(st => st.name),
    };
  });
  const coveredSubjects = rows.filter(r => r.covered).length;
  const totalSubtopics = rows.reduce((a, r) => a + r.subtopicsTotal, 0);
  const coveredSubtopics = rows.reduce((a, r) => a + r.subtopicsCovered, 0);
  return {
    subjects: rows,
    coveredSubjects,
    subjectsPct: pct(coveredSubjects, rows.length),
    totalSubtopics,
    coveredSubtopics,
    subtopicsPct: pct(coveredSubtopics, totalSubtopics),
  };
}
