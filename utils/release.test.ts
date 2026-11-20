import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db } from '../db';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/**
 * Trava de release: o que não pode mudar sem querer entre uma versão e a seguinte, senão atualizar o APK "por cima"
 * perde os dados ou deixa de funcionar.
 */
describe('release: atualizar por cima mantém os dados', () => {
  it('o banco continua em SprintDB v7 (mudar o schema exige uma nova version(n) com upgrade)', () => {
    expect(db.name).toBe('SprintDB');
    expect(db.verno).toBe(7);
    expect(db.tables.map(t => t.name).sort()).toEqual(
      ['blockLogs', 'errorEntries', 'objectives', 'redacaoSessions', 'reviewItems', 'settings', 'simuladoRecords', 'subjects'],
    );
  });

  it('o schema de cada versão antiga continua igual (nunca editar versões antigas)', () => {
    const src = read('db.ts');
    expect(src).toContain("subjects: 'id',");
    expect(src).toContain("blockLogs: 'id, subjectId, timestamp',");
    expect(src).toContain("reviewItems: 'id, subjectId, [subjectId+subtopic], nextReviewAt, consolidated',");
    expect(src).toContain("simuladoRecords: 'id, completedAt, templateId',");
    expect(src).toContain("redacaoSessions: 'id, completedAt, themeId',");
    expect([...src.matchAll(/this\.version\((\d+)\)/g)].map(m => Number(m[1]))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('o identificador do app não muda (outro appId instalaria um app novo, sem os dados)', () => {
    expect(read('capacitor.config.ts')).toContain("appId: 'com.workeric08.sprint'");
    expect(read('android/app/build.gradle')).toContain('applicationId "com.workeric08.sprint"');
  });

  it('versionCode cresce com a versão e vem só do package.json', () => {
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain("parse(file('../../package.json'))");
    expect(gradle).toContain('sprintVersionParts[0] * 10000 + sprintVersionParts[1] * 100 + sprintVersionParts[2]');
    expect(gradle).toContain('versionName sprintPkg.version');
  });
});

describe('release: permissões do Android', () => {
  it('o manifesto do app declara só a internet do WebView (as demais vêm dos plugins, uma a uma justificadas no README)', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    const perms = [...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map(m => m[1]);
    expect(perms).toEqual(['android.permission.INTERNET']);
  });
});
