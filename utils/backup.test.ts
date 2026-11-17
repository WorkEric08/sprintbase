import 'fake-indexeddb/auto'; // precisa vir antes do import do db
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import type { BlockLog, RedacaoSession, SimuladoRecord, Subject } from '../types';
import { SETTING_KEYS } from './settings';
import {
  BACKUP_FORMAT, BACKUP_VERSION, BackupError, BackupFile,
  backupFileName, createBackup, parseBackup, restoreBackup, serializeBackup, summarizeBackup,
} from './backup';

const subject = (over: Partial<Subject> = {}): Subject => ({
  id: 's1', title: 'Matemática', color: '#6366f1', duration: 25, blockCount: 10,
  completedBlocks: [{ timestamp: 1000, type: 'study' }, { timestamp: 2000, type: 'review' }],
  createdAt: 1,
  ...over,
});

const log = (over: Partial<BlockLog> = {}): BlockLog => ({
  id: 'l1', subjectId: 's1', subjectTitle: 'Matemática', subjectColor: '#6366f1', timestamp: 1000,
  questionsTotal: 10, questionsCorrect: 7, subtopic: 'Funções', selfScore: 4, flaggedForReview: false, blockType: 'study',
  ...over,
});

const simulado = (over: Partial<SimuladoRecord> = {}): SimuladoRecord => ({
  id: 'sim1', templateId: 'enem-dia2', templateName: 'ENEM — Dia 2', startedAt: 1000, completedAt: 2000,
  plannedDurationMinutes: 300, actualDurationMinutes: 300, completed: true,
  areaResults: [{ areaName: 'Matemática', color: '#3b82f6', questionsTotal: 45, questionsCorrect: 30 }],
  timeControlScore: 4, perception: 'Foi bem', redacaoText: '', redacaoScore: null,
  ...over,
});

const redacao = (over: Partial<RedacaoSession> = {}): RedacaoSession => ({
  id: 'red1', themeId: 'enem-2022', themeTitle: 'Tema', startedAt: 1000, lastSavedAt: 2000, completedAt: null,
  durationMinutes: 12, text: 'Texto com acentuação: coração, ação.', wordCount: 5, competencyScores: null, estimatedScore: null,
  notes: '', elapsedMs: 720000, ...over,
});

const valid = (tables: BackupFile['tables'] = {}): string =>
  JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-10-21T12:00:00.000Z', appVersion: '1.0.0', tables });

async function wipe() {
  await Promise.all(db.tables.map(t => t.clear()));
}

beforeEach(wipe);

describe('createBackup / restoreBackup', () => {
  it('inclui todas as tabelas do banco, mesmo as que a base não usa', async () => {
    const backup = await createBackup();
    expect(Object.keys(backup.tables)).toEqual(expect.arrayContaining([
      'subjects', 'blockLogs', 'settings', 'reviewItems', 'simuladoRecords', 'redacaoSessions',
    ]));
  });

  it('ida e volta: o que sai no backup volta idêntico depois de apagar tudo', async () => {
    await db.subjects.bulkPut([subject(), subject({ id: 's2', title: 'Física' })]);
    await db.blockLogs.put(log());
    await db.settings.bulkPut([{ key: 'user_name', value: 'Eric' }, { key: 'theme', value: 'dark' }]);

    const text = serializeBackup(await createBackup());
    await wipe();
    expect(await db.subjects.count()).toBe(0);

    await restoreBackup(parseBackup(text));

    expect((await db.subjects.toArray()).map(s => s.id).sort()).toEqual(['s1', 's2']);
    expect(await db.subjects.get('s1')).toEqual(subject());
    expect(await db.blockLogs.get('l1')).toEqual(log());
    expect(await db.settings.get('user_name')).toEqual({ key: 'user_name', value: 'Eric' });
  });

  it('os simulados registrados entram no backup e voltam idênticos', async () => {
    await db.simuladoRecords.put(simulado());
    const text = serializeBackup(await createBackup());
    await wipe();
    await restoreBackup(parseBackup(text));
    expect(await db.simuladoRecords.get('sim1')).toEqual(simulado());
  });

  it('as redações e os rascunhos (com o tempo já usado) entram no backup e voltam idênticos', async () => {
    await db.redacaoSessions.bulkPut([redacao(), redacao({ id: 'red2', completedAt: 3000, estimatedScore: 640 })]);
    const text = serializeBackup(await createBackup());
    await wipe();
    await restoreBackup(parseBackup(text));
    expect(await db.redacaoSessions.get('red1')).toEqual(redacao());
    expect((await db.redacaoSessions.get('red2'))?.estimatedScore).toBe(640);
  });

  it('o simulado em ANDAMENTO não vai no backup (é do momento), mas o resto das configurações vai', async () => {
    await db.settings.bulkPut([
      { key: SETTING_KEYS.simuladoActive, value: '{"startedAt":1}' },
      { key: 'theme', value: 'dark' },
    ]);
    const backup = await createBackup();
    expect((backup.tables.settings as { key: string }[]).map(r => r.key)).toEqual(['theme']);
    expect(await db.settings.get(SETTING_KEYS.simuladoActive)).toBeDefined(); // o banco em uso não é tocado
  });

  it('restaurar SUBSTITUI os dados atuais (não mescla)', async () => {
    await db.subjects.put(subject({ id: 'velha', title: 'Antiga' }));
    await db.settings.put({ key: 'theme', value: 'light' });

    await restoreBackup(parseBackup(valid({ subjects: [subject()] })));

    expect((await db.subjects.toArray()).map(s => s.id)).toEqual(['s1']);
    expect(await db.settings.count()).toBe(0); // tabela ausente no arquivo fica vazia
  });

  it('ignora tabelas desconhecidas do arquivo', async () => {
    await restoreBackup(parseBackup(valid({ subjects: [subject()], tabelaDoFuturo: [{ id: 'x' }] })));
    expect(await db.subjects.count()).toBe(1);
  });

  it('é atômico: se a restauração falha, os dados atuais continuam intactos', async () => {
    await db.subjects.put(subject({ id: 'atual', title: 'Dado atual' }));
    // Linha sem a chave primária ("id") passa pelo tipo mas faz o bulkPut falhar no meio da transação.
    const quebrado: BackupFile = {
      format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '', appVersion: '',
      tables: { subjects: [{ title: 'sem id' }] },
    };

    await expect(restoreBackup(quebrado)).rejects.toBeInstanceOf(BackupError);

    expect((await db.subjects.toArray()).map(s => s.id)).toEqual(['atual']);
  });
});

describe('parseBackup', () => {
  it('aceita um backup válido, inclusive vazio', () => {
    expect(parseBackup(valid()).tables).toEqual({});
    expect(parseBackup(valid({ subjects: [subject()], blockLogs: [log()] })).tables.subjects).toHaveLength(1);
  });

  const rejeita = (texto: string, trecho: RegExp) => {
    let erro: unknown;
    try { parseBackup(texto); } catch (e) { erro = e; }
    expect(erro).toBeInstanceOf(BackupError);
    expect((erro as BackupError).message).toMatch(trecho);
  };

  it('rejeita texto que não é JSON', () => rejeita('isto não é json', /não é um JSON/));
  it('rejeita JSON de outro app', () => rejeita('{"format":"outro","version":1,"tables":{}}', /não é um backup do Sprint/));
  it('rejeita array solto', () => rejeita('[]', /não é um backup do Sprint/));
  it('rejeita versão ausente', () =>
    rejeita(JSON.stringify({ format: BACKUP_FORMAT, tables: {} }), /versão ausente/));
  it('rejeita backup de versão mais nova', () =>
    rejeita(JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, tables: {} }), /versão mais nova/));
  it('rejeita arquivo sem tabelas', () =>
    rejeita(JSON.stringify({ format: BACKUP_FORMAT, version: 1 }), /sem dados/));
  it('rejeita tabela que não é lista', () => rejeita(valid({ subjects: {} as never }), /tabela "subjects"/));
  it('rejeita matéria sem id', () =>
    rejeita(valid({ subjects: [{ ...subject(), id: undefined }] }), /Matéria #1 inválida \(sem id\)/));
  it('rejeita matéria com bloco concluído de tipo inexistente', () =>
    rejeita(valid({ subjects: [subject({ completedBlocks: [{ timestamp: 1, type: 'xyz' as never }] })] }), /bloco concluído/));
  it('rejeita simulado sem resultado por área', () =>
    rejeita(valid({ simuladoRecords: [{ ...simulado(), areaResults: 'x' as never }] }), /Simulado #1 inválido \(resultado por área\)/));
  it('rejeita redação sem texto ou sem tema', () => {
    rejeita(valid({ redacaoSessions: [{ ...redacao(), text: undefined as never }] }), /Redação #1 inválida \(texto\)/);
    rejeita(valid({ redacaoSessions: [{ ...redacao(), themeId: undefined as never }] }), /Redação #1 inválida \(sem tema\)/);
  });
  it('rejeita simulado sem id', () =>
    rejeita(valid({ simuladoRecords: [{ ...simulado(), id: '' }] }), /Simulado #1 inválido \(sem id\)/));
  it('rejeita configuração com valor que não é texto', () =>
    rejeita(valid({ settings: [{ key: 'a', value: 5 }] }), /Configuração #1 inválida/));
});

describe('summarizeBackup / backupFileName', () => {
  it('resume contagens e data', () => {
    const s = summarizeBackup(parseBackup(valid({ subjects: [subject(), subject({ id: 's2' })], blockLogs: [log()] })));
    expect(s.subjects).toBe(2);
    expect(s.blockLogs).toBe(1);
    expect(s.exportedAt?.toISOString()).toBe('2026-10-21T12:00:00.000Z');
  });
  it('data inválida vira null', () => {
    expect(summarizeBackup({ ...parseBackup(valid()), exportedAt: 'lixo' }).exportedAt).toBeNull();
  });
  it('nome do arquivo usa a data local', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe('sprint-backup-2026-01-05.json');
  });
});
