import { describe, expect, it } from 'vitest';
import { BlockLog, Edital, Subject } from '../types';
import { ENEM } from '../data/editais';
import {
  computeCoverage, customToEdital, matchSubject, parseCustomEdital, planApply, resolveEdital, serializeCustomEdital,
} from './edital';

const subject = (over: Partial<Subject> = {}): Subject => ({
  id: 's1', title: 'Matemática', color: '#3b82f6', duration: 50, blockCount: 10, completedBlocks: [], ...over,
});
const log = (over: Partial<BlockLog> = {}): BlockLog => ({
  id: 'l', subjectId: 's1', subjectTitle: 'Matemática', subjectColor: '#3b82f6', timestamp: 1, questionsTotal: 5,
  questionsCorrect: 3, subtopic: '', selfScore: 3, flaggedForReview: false, blockType: 'study', ...over,
});
const done = (n: number) => Array.from({ length: n }, (_, i) => ({ timestamp: i + 1, type: 'study' as const }));

const edital: Edital = {
  id: 'x', name: 'Prova X', organizer: 'Banca', category: 'federal', typicalMonth: '', disclaimer: '',
  subjects: [
    { name: 'Matemática', weight: 50, color: '#3b82f6', subtopics: [{ name: 'Funções', incidencia: 0 }, { name: 'Geometria', incidencia: 0 }] },
    { name: 'Português', weight: 50, color: '#8b5cf6', subtopics: [] },
  ],
};

describe('ligação matéria ↔ edital por chave (renomear não quebra)', () => {
  it('a chave vale mesmo depois de renomear a matéria no app', () => {
    const renamed = subject({ title: 'Mat. do ENEM', editalKey: 'Matemática' });
    expect(matchSubject([renamed], 'Matemática')?.id).toBe('s1');
    const cov = computeCoverage(edital, [{ ...renamed, completedBlocks: done(2) }], []);
    expect(cov.subjects[0].covered).toBe(true);
  });

  it('matéria antiga, sem chave, ainda casa pelo nome (sem diferenciar maiúsculas)', () => {
    expect(matchSubject([subject({ title: 'matemática' })], 'Matemática')?.id).toBe('s1');
  });

  it('uma matéria que já tem chave de OUTRA matéria do edital não é roubada pelo nome', () => {
    const taken = subject({ id: 'a', title: 'Matemática', editalKey: 'Português' });
    expect(matchSubject([taken], 'Matemática')).toBeNull();
  });

  it('a chave tem prioridade sobre uma matéria sem chave de mesmo nome', () => {
    const byName = subject({ id: 'nome', title: 'Matemática' });
    const byKey = subject({ id: 'chave', title: 'Outra coisa', editalKey: 'Matemática' });
    expect(matchSubject([byName, byKey], 'Matemática')?.id).toBe('chave');
  });
});

describe('aplicar um edital', () => {
  it('cria as matérias que faltam, com a chave, e liga as que já existem sem duplicar', () => {
    const plan = planApply(ENEM, [subject({ id: 'm', title: 'Matemática' })]);
    expect(plan.link).toEqual([{ id: 'm', editalKey: 'Matemática' }]);
    expect(plan.add.map(a => a.title)).toEqual(['Linguagens e Códigos', 'Língua Estrangeira', 'Ciências Humanas', 'Ciências da Natureza', 'Redação']);
    expect(plan.add.every(a => a.editalKey === a.title && a.duration === 50)).toBe(true);
  });

  it('ENEM: a meta de blocos acompanha o peso (mínimo 10); personalizado: 20', () => {
    const enem = planApply(ENEM, []).add;
    expect(enem.find(a => a.title === 'Matemática')?.blockCount).toBe(10); // 22/5 → 4 → mínimo 10
    expect(enem.every(a => a.blockCount >= 10)).toBe(true);
    const custom = planApply(customToEdital({ name: 'OAB', subjects: [{ name: 'Ética', color: '#000' }] }), []).add;
    expect(custom[0].blockCount).toBe(20);
  });

  it('aplicar duas vezes não cria nada novo nem refaz ligações', () => {
    const first = planApply(ENEM, []);
    const created: Subject[] = first.add.map((a, i) => subject({ id: `n${i}`, title: a.title, editalKey: a.editalKey }));
    const second = planApply(ENEM, created);
    expect(second).toEqual({ add: [], link: [] });
  });

  it('matéria renomeada (com chave) não é recriada ao aplicar de novo', () => {
    const renamed = subject({ id: 'm', title: 'Mat', editalKey: 'Matemática' });
    expect(planApply(ENEM, [renamed]).add.map(a => a.title)).not.toContain('Matemática');
  });
});

describe('cobertura do edital', () => {
  it('matéria coberta = pelo menos 1 bloco concluído; subtópico coberto = aparece nos registros da matéria', () => {
    const subjects = [subject({ completedBlocks: done(1) })];
    const cov = computeCoverage(edital, subjects, [log({ subtopic: ' funções ' })]);
    expect(cov.coveredSubjects).toBe(1);
    expect(cov.subjectsPct).toBe(50);
    expect(cov.subjects[0]).toMatchObject({ subtopicsTotal: 2, subtopicsCovered: 1, untouchedSubtopics: ['Geometria'] });
    expect(cov.subtopicsPct).toBe(50);
    expect(cov.subjects[1].appSubject).toBeNull();
  });

  it('registro de outra matéria não conta para os subtópicos desta', () => {
    const cov = computeCoverage(edital, [subject()], [log({ subjectId: 'outra', subtopic: 'Funções' })]);
    expect(cov.coveredSubtopics).toBe(0);
  });

  it('edital sem subtópicos (ENEM, personalizado): só a cobertura por matéria', () => {
    const cov = computeCoverage(ENEM, [], []);
    expect(cov.totalSubtopics).toBe(0);
    expect(cov.subtopicsPct).toBe(0);
    expect(cov.subjectsPct).toBe(0);
  });
});

describe('edital personalizado e edital ativo', () => {
  it('ida e volta pelo JSON, e valor estragado vira "nenhum"', () => {
    const c = { name: 'OAB', subjects: [{ name: 'Ética', color: '#10b981' }] };
    expect(parseCustomEdital(serializeCustomEdital(c))).toEqual(c);
    expect(parseCustomEdital(undefined)).toBeNull();
    expect(parseCustomEdital('{não')).toBeNull();
    expect(parseCustomEdital('{"name":1,"subjects":[]}')).toBeNull();
    expect(parseCustomEdital('{"name":"a","subjects":[{"name":"x"}]}')).toBeNull();
  });

  it('resolveEdital: ENEM, personalizado (se existir) ou nenhum', () => {
    expect(resolveEdital('enem', undefined)?.id).toBe('enem');
    expect(resolveEdital('custom', serializeCustomEdital({ name: 'OAB', subjects: [] }))?.name).toBe('OAB');
    expect(resolveEdital('custom', undefined)).toBeNull();
    expect(resolveEdital(undefined, undefined)).toBeNull();
    expect(resolveEdital('prf', undefined)).toBeNull();
  });
});
