import { describe, expect, it } from 'vitest';
import { addDays } from './dateUtils';
import {
  bonusLabel, computeFullStreak, shouldShowWelcomeBack, streakLabel, streakSubLabel,
} from './streakUtils';

const TODAY = '2026-10-21';
/** Chave do dia `n` dias antes de hoje (0 = hoje). */
const d = (n: number) => addDays(TODAY, -n);
const set = (...offsets: number[]) => new Set(offsets.map(d));
/** Dias consecutivos de `from` até `to` dias atrás (inclusive), ex.: run(6, 0) = 7 dias terminando hoje. */
const run = (from: number, to: number) => {
  const out: number[] = [];
  for (let i = from; i >= to; i--) out.push(i);
  return out;
};

describe('computeFullStreak — casos básicos', () => {
  it('sem dados: tudo zerado', () => {
    expect(computeFullStreak(new Set(), TODAY)).toEqual({
      currentStreak: 0, bonusBalance: 0, longestStreak: 0, totalStudyDays: 0, lastStudyDate: null, bonusUsedRecently: false,
    });
  });
  it('estudou só hoje: 1 dia', () => {
    const s = computeFullStreak(set(0), TODAY);
    expect(s.currentStreak).toBe(1);
    expect(s.lastStudyDate).toBe(TODAY);
    expect(s.totalStudyDays).toBe(1);
  });
  it('estudou só ontem: a sequência ainda está viva', () => {
    expect(computeFullStreak(set(1), TODAY).currentStreak).toBe(1);
  });
  it('dias consecutivos terminando hoje', () => {
    const s = computeFullStreak(set(...run(4, 0)), TODAY);
    expect(s.currentStreak).toBe(5);
    expect(s.longestStreak).toBe(5);
    expect(s.bonusBalance).toBe(0);
  });
  it('última vez há 2 dias, sem bônus: sequência perdida (recorde preservado)', () => {
    const s = computeFullStreak(set(...run(5, 2)), TODAY);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(4);
    expect(s.lastStudyDate).toBe(d(2));
  });
  it('ignora dias futuros (relógio do aparelho foi voltado)', () => {
    const s = computeFullStreak(new Set([d(0), addDays(TODAY, 3), addDays(TODAY, 4)]), TODAY);
    expect(s.currentStreak).toBe(1);
    expect(s.totalStudyDays).toBe(1);
  });
});

describe('computeFullStreak — dias bônus', () => {
  it('7 dias seguidos rendem 1 bônus', () => {
    const s = computeFullStreak(set(...run(6, 0)), TODAY);
    expect(s.currentStreak).toBe(7);
    expect(s.bonusBalance).toBe(1);
  });
  it('14 dias rendem 2 e 21 rendem 3', () => {
    expect(computeFullStreak(set(...run(13, 0)), TODAY).bonusBalance).toBe(2);
    expect(computeFullStreak(set(...run(20, 0)), TODAY).bonusBalance).toBe(3);
  });
  it('o máximo guardado é 3', () => {
    expect(computeFullStreak(set(...run(34, 0)), TODAY).bonusBalance).toBe(3);
  });
  it('CASO QUE O ORIGINAL ERRAVA: 7 dias, falta 1, volta hoje → sequência continua e gasta o bônus', () => {
    // dias 8..2 atrás estudados (7 dias), ontem faltou, hoje estudou
    const s = computeFullStreak(set(...run(8, 2), 0), TODAY);
    expect(s.currentStreak).toBe(8);
    expect(s.bonusBalance).toBe(0);
    expect(s.bonusUsedRecently).toBe(true); // a falta foi ontem
  });
  it('a falta coberta não soma à sequência (só dias estudados)', () => {
    const s = computeFullStreak(set(...run(8, 2), 0), TODAY);
    expect(s.currentStreak).toBe(8); // 7 + hoje; ontem (bônus) não conta
  });
  it('falta antiga coberta por bônus: segue sem avisar de "uso recente"', () => {
    // 7 dias (15..9), falta no dia 8, depois estuda 7..0
    const s = computeFullStreak(set(...run(15, 9), ...run(7, 0)), TODAY);
    expect(s.currentStreak).toBe(15);
    expect(s.bonusUsedRecently).toBe(false);
    expect(s.bonusBalance).toBe(1); // gastou 1, ganhou 1 ao completar mais 7 dias
  });
  it('falta de 1 dia SEM bônus quebra a sequência', () => {
    const s = computeFullStreak(set(...run(4, 2), 0), TODAY); // 3 dias, falta ontem, hoje
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(3);
  });
  it('falta de 2+ dias quebra mesmo com bônus e zera os bônus', () => {
    const s = computeFullStreak(set(...run(10, 4), 1, 0), TODAY); // 7 dias, falta 2, volta
    expect(s.currentStreak).toBe(2);
    expect(s.bonusBalance).toBe(0);
    expect(s.longestStreak).toBe(7);
  });
  it('ontem em branco com bônus guardado e hoje ainda sem estudo: continua viva e já conta o bônus como usado', () => {
    const s = computeFullStreak(set(...run(8, 2)), TODAY); // 7 dias terminando anteontem
    expect(s.currentStreak).toBe(7);
    expect(s.bonusBalance).toBe(0);
    expect(s.bonusUsedRecently).toBe(true);
  });
  it('ontem em branco SEM bônus e hoje sem estudo: já perdeu', () => {
    const s = computeFullStreak(set(...run(4, 2)), TODAY);
    expect(s.currentStreak).toBe(0);
  });
  it('bônus guardado não cobre 3 dias sem estudar', () => {
    const s = computeFullStreak(set(...run(9, 3)), TODAY); // última vez há 3 dias
    expect(s.currentStreak).toBe(0);
  });
});

describe('computeFullStreak — recorde', () => {
  it('o recorde é o pico que o usuário viu, inclusive atravessando uma falta coberta por bônus', () => {
    // 7 dias, falta (coberta), 7 dias = 14 seguidos; depois uma pausa longa quebra a sequência.
    const s = computeFullStreak(set(...run(23, 17), ...run(15, 9), 0), TODAY);
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(14);
  });
  it('o recorde nunca fica abaixo da sequência atual', () => {
    const s = computeFullStreak(set(...run(8, 2), 0), TODAY); // 7 dias, falta coberta, hoje
    expect(s.currentStreak).toBe(8);
    expect(s.longestStreak).toBe(8);
  });
  it('o recorde antigo é preservado depois de perder a sequência', () => {
    const s = computeFullStreak(set(...run(20, 14), 0), TODAY);
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(7);
  });
});

describe('virada de mês e de ano', () => {
  it('conta sequência atravessando 31/12 → 01/01', () => {
    const today = '2027-01-02';
    const days = new Set(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(computeFullStreak(days, today).currentStreak).toBe(4);
  });
  it('29/02 de ano bissexto não quebra a sequência', () => {
    const days = new Set(['2028-02-28', '2028-02-29', '2028-03-01']);
    expect(computeFullStreak(days, '2028-03-01').currentStreak).toBe(3);
  });
});

describe('shouldShowWelcomeBack', () => {
  it('mostra após 3+ dias fora com recorde de 3+', () => {
    const s = computeFullStreak(set(...run(8, 5)), TODAY); // 4 dias, último há 5
    expect(shouldShowWelcomeBack(s, TODAY)).toBe(true);
  });
  it('não mostra com sequência ativa', () => {
    expect(shouldShowWelcomeBack(computeFullStreak(set(...run(4, 0)), TODAY), TODAY)).toBe(false);
  });
  it('não mostra com menos de 3 dias fora', () => {
    expect(shouldShowWelcomeBack(computeFullStreak(set(...run(5, 2)), TODAY), TODAY)).toBe(false);
  });
  it('não mostra sem recorde de 3 dias (quem mal usou o app)', () => {
    expect(shouldShowWelcomeBack(computeFullStreak(set(9, 8), TODAY), TODAY)).toBe(false);
  });
  it('não mostra para quem nunca estudou', () => {
    expect(shouldShowWelcomeBack(computeFullStreak(new Set(), TODAY), TODAY)).toBe(false);
  });
});

describe('textos (nunca culpam)', () => {
  it('rótulos da sequência', () => {
    expect(streakLabel({ ...computeFullStreak(new Set(), TODAY) })).toBe('Vamos começar!');
    expect(streakLabel(computeFullStreak(set(0), TODAY))).toBe('1 dia seguido');
    expect(streakLabel(computeFullStreak(set(2, 1, 0), TODAY))).toBe('3 dias seguidos');
  });
  it('rótulos de bônus', () => {
    expect(bonusLabel(0)).toBe('Sem dias bônus');
    expect(bonusLabel(1)).toBe('1 dia bônus guardado');
    expect(bonusLabel(3)).toBe('3 dias bônus guardados');
  });
  it('subtítulo por faixa', () => {
    const at = (n: number) => streakSubLabel(computeFullStreak(set(...run(n - 1, 0)), TODAY));
    expect(at(1)).toBe('Você está construindo o hábito');
    expect(at(5)).toBe('Bom ritmo! Continue assim');
    expect(at(10)).toBe('Ritmo consistente');
    expect(at(30)).toBe('Disciplina de longo prazo');
    expect(streakSubLabel(computeFullStreak(new Set(), TODAY))).toBe('Estude hoje para começar');
  });
});
