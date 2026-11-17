import { describe, expect, it } from 'vitest';
import { RedacaoSession } from '../types';
import {
  PAPER_TAG, WRITING_MS, Writing, buildDraft, buildFinished, clockStarted, clockStopAt, clockStopped, countWords,
  elapsedOf, isDraft, isPaper, latestDraft, parseCompleted, plainNotes, remainingOf, serializeCompleted, totalScore,
  wordStatus, writingFromDraft,
} from './redacao';

const T0 = 1_700_000_000_000;
const MIN = 60_000;

const writing = (over: Partial<Writing> = {}): Writing => ({
  id: 'r1', themeId: 'enem-2022', themeTitle: 'Tema', startedAt: T0, text: 'um dois três', elapsedMs: 12 * MIN, paper: false, ...over,
});

describe('palavras', () => {
  it('conta por espaços, ignorando quebras de linha e espaços repetidos', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
    expect(countWords('uma  frase\ncom   quebra')).toBe(4);
  });

  it('o tamanho ideal vai de 150 a 500 palavras', () => {
    expect(wordStatus(149)).toBe('short');
    expect(wordStatus(150)).toBe('ideal');
    expect(wordStatus(500)).toBe('ideal');
    expect(wordStatus(501)).toBe('long');
  });
});

describe('cronômetro de escrita', () => {
  it('conta pelo horário real: parado não anda, e a tela apagada por horas não congela o que já corria', () => {
    let c = clockStopped();
    expect(elapsedOf(c, T0 + 10 * MIN)).toBe(0);
    c = clockStarted(c, T0);
    expect(elapsedOf(c, T0 + 10 * MIN)).toBe(10 * MIN);
    c = clockStopAt(c, T0 + 25 * MIN);
    expect(c).toEqual({ base: 25 * MIN, since: null });
    expect(elapsedOf(c, T0 + 5 * 60 * MIN)).toBe(25 * MIN);
    c = clockStarted(c, T0 + 60 * MIN);
    expect(remainingOf(c, T0 + 80 * MIN)).toBe(WRITING_MS - 45 * MIN);
  });

  it('nunca passa de 90 minutos', () => {
    const c = clockStarted(clockStopped(), T0);
    expect(elapsedOf(c, T0 + 200 * MIN)).toBe(WRITING_MS);
    expect(remainingOf(c, T0 + 200 * MIN)).toBe(0);
  });

  it('iniciar já correndo ou parar já parado não muda nada', () => {
    const running = clockStarted(clockStopped(), T0);
    expect(clockStarted(running, T0 + MIN)).toBe(running);
    const stopped = clockStopped(5 * MIN);
    expect(clockStopAt(stopped, T0)).toBe(stopped);
  });
});

describe('rascunho', () => {
  it('guarda o texto, as palavras e o tempo de escrita acumulado, sem nota', () => {
    const d = buildDraft(writing(), T0 + 20 * MIN);
    expect(d).toMatchObject({
      id: 'r1', completedAt: null, text: 'um dois três', wordCount: 3, durationMinutes: 12, elapsedMs: 12 * MIN,
      competencyScores: null, estimatedScore: null, notes: '', lastSavedAt: T0 + 20 * MIN,
    });
    expect(isDraft(d)).toBe(true);
  });

  it('modo papel fica marcado no rascunho e é reconhecido ao voltar', () => {
    const d = buildDraft(writing({ paper: true, text: '' }), T0);
    expect(d.notes).toBe(PAPER_TAG);
    expect(isPaper(d)).toBe(true);
    expect(writingFromDraft(d).paper).toBe(true);
  });

  it('ao voltar, o texto, o tempo e a identidade são os mesmos (é o que recupera o trabalho depois de o Android matar o app)', () => {
    const original = writing({ text: 'texto longo com acentuação: coração, ação, não', elapsedMs: 41 * MIN });
    const back = writingFromDraft(buildDraft(original, T0 + 50 * MIN));
    expect(back).toEqual(original);
  });

  it('rascunho de versão antiga, sem elapsedMs, volta com o tempo em minutos', () => {
    const old: RedacaoSession = { ...buildDraft(writing(), T0), elapsedMs: undefined, durationMinutes: 7 };
    expect(writingFromDraft(old).elapsedMs).toBe(7 * MIN);
  });

  it('o mais recente é o último salvo; concluídas não contam como rascunho', () => {
    const a = buildDraft(writing({ id: 'a' }), T0 + 1);
    const b = buildDraft(writing({ id: 'b' }), T0 + 5);
    const done = buildFinished(writing({ id: 'c' }), null, '', T0 + 9);
    expect(latestDraft([a, done, b])?.id).toBe('b');
    expect(latestDraft([done])).toBeNull();
    expect(latestDraft([])).toBeNull();
  });
});

describe('redação concluída', () => {
  const scores = { c1: 160, c2: 120, c3: 120, c4: 160, c5: 80 };

  it('a nota é a soma das 5 competências (0–1000)', () => {
    expect(totalScore(scores)).toBe(640);
    const f = buildFinished(writing(), scores, ' faltou proposta ', T0 + 90 * MIN);
    expect(f).toMatchObject({ estimatedScore: 640, completedAt: T0 + 90 * MIN, notes: 'faltou proposta', durationMinutes: 12 });
    expect(isDraft(f)).toBe(false);
  });

  it('"salvar sem nota" conclui sem inventar nota', () => {
    const f = buildFinished(writing(), null, '', T0);
    expect(f.completedAt).toBe(T0);
    expect(f.competencyScores).toBeNull();
    expect(f.estimatedScore).toBeNull();
  });

  it('modo papel: sem texto, observações com a marca', () => {
    const f = buildFinished(writing({ paper: true, text: 'não deveria ser guardado' }), scores, 'ficou curta', T0);
    expect(f.text).toBe('');
    expect(f.wordCount).toBe(0);
    expect(f.notes).toBe(`${PAPER_TAG} ficou curta`);
    expect(plainNotes(f)).toBe('ficou curta');
    expect(buildFinished(writing({ paper: true }), scores, '', T0).notes).toBe(PAPER_TAG);
  });

  it('o tempo nunca passa de 90 min, e o modo desenvolvedor conta os 90 inteiros', () => {
    expect(buildFinished(writing({ elapsedMs: 500 * MIN }), scores, '', T0).durationMinutes).toBe(90);
    expect(buildFinished(writing({ elapsedMs: 3 * MIN }), scores, '', T0, true).durationMinutes).toBe(90);
  });
});

describe('temas já feitos', () => {
  it('ida e volta e tolerância a valor estragado', () => {
    expect([...parseCompleted(serializeCompleted(new Set(['a', 'b'])))]).toEqual(['a', 'b']);
    expect(parseCompleted(undefined).size).toBe(0);
    expect(parseCompleted('{não é json').size).toBe(0);
    expect(parseCompleted('{"a":1}').size).toBe(0);
    expect([...parseCompleted('["a", 3, null, "b"]')]).toEqual(['a', 'b']);
  });
});
