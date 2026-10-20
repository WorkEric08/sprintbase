import Dexie, { Table } from 'dexie';
import { BlockLog, Subject } from './types';

interface SettingRecord {
  key: string;
  value: string;
}

/**
 * Mesmo banco e mesmo histórico de versões do app original ('SprintDB', v1–v7).
 * As tabelas que a base ainda não usa (objectives, reviewItems, simuladoRecords,
 * redacaoSessions) continuam declaradas: o Dexie exige o schema completo para abrir
 * um banco já existente, e assim os módulos futuros voltam sem migração.
 *
 * NUNCA editar versões antigas — mudanças de schema = nova `this.version(n)`.
 */
class SprintDB extends Dexie {
  subjects!: Table<Subject>;
  settings!: Table<SettingRecord>;
  blockLogs!: Table<BlockLog>;

  constructor() {
    super('SprintDB');

    this.version(1).stores({
      subjects: 'id',
      objectives: 'id',
      settings: 'key',
    });

    this.version(2).stores({
      blockLogs: 'id, subjectId, timestamp',
      errorEntries: 'id, subjectId, blockLogId, timestamp',
    });

    this.version(3)
      .stores({
        reviewItems: 'id, subjectId, [subjectId+subtopic], nextReviewAt, consolidated',
      })
      .upgrade(tx =>
        // completedBlocks: number[] → CompletedBlock[]
        tx.table('subjects').toCollection().modify((subject: { completedBlocks?: unknown[] }) => {
          const blocks = subject.completedBlocks;
          if (!Array.isArray(blocks) || blocks.length === 0) return;
          if (typeof blocks[0] === 'number') {
            subject.completedBlocks = (blocks as number[]).map(ts => ({ timestamp: ts, type: 'study' }));
          }
        })
      );

    this.version(4).stores({
      simuladoRecords: 'id, completedAt, templateId',
    });

    this.version(5).stores({
      redacaoSessions: 'id, completedAt, themeId',
    });

    // v6/v7: conquistas criadas e removidas no original; mantidas no histórico.
    this.version(6).stores({
      achievements: 'id, unlockedAt',
    });

    this.version(7).stores({
      achievements: null,
    });
  }
}

export const db = new SprintDB();
