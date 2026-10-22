import { db } from '../db';

/**
 * Backup completo dos dados do app em um único arquivo JSON.
 *
 * Cobre TODAS as tabelas do banco (inclusive as que a base ainda não usa), então os módulos
 * que voltarem depois (simulados, redação, revisão...) entram no backup sem mudar este arquivo.
 * Importar SUBSTITUI os dados atuais. É a proteção contra desinstalar o app ou trocar de aparelho.
 */

export const BACKUP_FORMAT = 'sprint-backup';
/** Versão do formato do arquivo (não é a versão do app nem a do banco). */
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string; // ISO
  appVersion: string;
  tables: Record<string, unknown[]>;
}

export interface BackupSummary {
  subjects: number;
  blockLogs: number;
  exportedAt: Date | null;
}

/** Erro com mensagem já pronta para mostrar ao usuário (pt-BR). */
export class BackupError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const BLOCK_TYPES = ['study', 'review', 'questions'];

// ── Exportar ─────────────────────────────────────────────────────────────

export async function createBackup(now: Date = new Date()): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) tables[table.name] = await table.toArray();
  });
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    appVersion: __APP_VERSION__,
    tables,
  };
}

export const serializeBackup = (backup: BackupFile): string => JSON.stringify(backup);

/** sprint-backup-2026-10-21.json (data no fuso local). */
export function backupFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `sprint-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

// ── Validar ──────────────────────────────────────────────────────────────

function validateSubject(row: unknown, i: number) {
  const bad = (why: string) => new BackupError(`Matéria #${i + 1} inválida (${why}).`);
  if (!isObject(row)) throw bad('formato');
  if (typeof row.id !== 'string' || !row.id) throw bad('sem id');
  if (typeof row.title !== 'string') throw bad('sem nome');
  if (typeof row.color !== 'string') throw bad('sem cor');
  if (typeof row.duration !== 'number' || !(row.duration > 0)) throw bad('duração');
  if (typeof row.blockCount !== 'number' || !(row.blockCount >= 0)) throw bad('meta de blocos');
  if (!Array.isArray(row.completedBlocks)) throw bad('blocos concluídos');
  for (const b of row.completedBlocks) {
    if (!isObject(b) || typeof b.timestamp !== 'number' || !BLOCK_TYPES.includes(b.type as string)) throw bad('bloco concluído');
  }
}

function validateBlockLog(row: unknown, i: number) {
  const bad = (why: string) => new BackupError(`Registro de bloco #${i + 1} inválido (${why}).`);
  if (!isObject(row)) throw bad('formato');
  if (typeof row.id !== 'string' || !row.id) throw bad('sem id');
  if (typeof row.subjectId !== 'string') throw bad('sem matéria');
  if (typeof row.timestamp !== 'number') throw bad('sem data');
}

function validateSetting(row: unknown, i: number) {
  const bad = (why: string) => new BackupError(`Configuração #${i + 1} inválida (${why}).`);
  if (!isObject(row)) throw bad('formato');
  if (typeof row.key !== 'string' || !row.key) throw bad('sem chave');
  if (typeof row.value !== 'string') throw bad('valor');
}

const ROW_VALIDATORS: Record<string, (row: unknown, i: number) => void> = {
  subjects: validateSubject,
  blockLogs: validateBlockLog,
  settings: validateSetting,
};

/** Lê e valida o texto de um arquivo de backup. Lança `BackupError` se não servir. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('O arquivo não é um backup válido (não é um JSON).');
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT) {
    throw new BackupError('Este arquivo não é um backup do Sprint.');
  }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
    throw new BackupError('O arquivo de backup está corrompido (versão ausente).');
  }
  if (data.version > BACKUP_VERSION) {
    throw new BackupError('Este backup foi criado por uma versão mais nova do app. Atualize o Sprint e tente de novo.');
  }
  if (!isObject(data.tables)) throw new BackupError('O arquivo de backup está corrompido (sem dados).');

  const tables: Record<string, unknown[]> = {};
  for (const [name, rows] of Object.entries(data.tables)) {
    if (!Array.isArray(rows)) throw new BackupError(`O arquivo de backup está corrompido (tabela "${name}").`);
    const validate = ROW_VALIDATORS[name];
    if (validate) rows.forEach(validate);
    else if (rows.some(r => !isObject(r))) throw new BackupError(`O arquivo de backup está corrompido (tabela "${name}").`);
    tables[name] = rows;
  }

  return {
    format: BACKUP_FORMAT,
    version: data.version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : '',
    tables,
  };
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const date = new Date(backup.exportedAt);
  return {
    subjects: backup.tables.subjects?.length ?? 0,
    blockLogs: backup.tables.blockLogs?.length ?? 0,
    exportedAt: Number.isNaN(date.getTime()) ? null : date,
  };
}

// ── Restaurar ────────────────────────────────────────────────────────────

/**
 * Substitui TODOS os dados atuais pelos do backup, numa única transação: se algo falhar,
 * nada é alterado. Tabelas ausentes no arquivo ficam vazias; tabelas do arquivo que este
 * app não conhece são ignoradas.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
        const rows = backup.tables[table.name];
        if (rows?.length) await table.bulkPut(rows);
      }
    });
  } catch (e) {
    console.error('Falha ao restaurar o backup', e);
    throw new BackupError('Não foi possível restaurar o backup. Seus dados atuais não foram alterados.');
  }
}
