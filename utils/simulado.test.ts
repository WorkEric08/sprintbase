import { describe, expect, it } from 'vitest';
import { SimuladoSession, SimuladoTemplate } from '../types';
import {
  MS_MINUTE, createSession, elapsedMs, endSession, isOver, isPaused, milestonesToAnnounce, outcomeOf, parseSession,
  pauseSession, remainingMs, resumeSession, serializeSession, upcomingAlerts,
} from './simulado';

const T0 = 1_700_000_000_000;
const HOUR = 60 * MS_MINUTE;

const template = (over: Partial<SimuladoTemplate> = {}): SimuladoTemplate => ({
  id: 'custom', name: 'Customizado', durationMinutes: 330, strictMode: false, hasRedacao: false, areas: [], ...over,
});
const start = (over: Partial<SimuladoTemplate> = {}, speed = 1) => createSession(template(over), T0, speed);

describe('relógio do simulado', () => {
  it('conta pelo horário real: o que falta só depende de (início, agora)', () => {
    const s = start();
    expect(remainingMs(s, T0)).toBe(330 * MS_MINUTE);
    expect(remainingMs(s, T0 + 5 * HOUR)).toBe(30 * MS_MINUTE); // tela apagada por 5 h: continua certo
    expect(remainingMs(s, T0 + 6 * HOUR)).toBe(0);
    expect(isOver(s, T0 + 5 * HOUR)).toBe(false);
    expect(isOver(s, T0 + 5.5 * HOUR)).toBe(true);
  });

  it('a pausa congela o relógio e a retomada devolve o tempo parado', () => {
    let s = start();
    s = pauseSession(s, T0 + HOUR);
    expect(isPaused(s)).toBe(true);
    expect(remainingMs(s, T0 + HOUR)).toBe(270 * MS_MINUTE);
    expect(remainingMs(s, T0 + 3 * HOUR)).toBe(270 * MS_MINUTE); // parado
    s = resumeSession(s, T0 + 3 * HOUR);
    expect(isPaused(s)).toBe(false);
    expect(s.pausedMs).toBe(2 * HOUR);
    expect(remainingMs(s, T0 + 3 * HOUR)).toBe(270 * MS_MINUTE);
    expect(remainingMs(s, T0 + 4 * HOUR)).toBe(210 * MS_MINUTE);
  });

  it('modo estrito não pausa', () => {
    const s = start({ strictMode: true });
    expect(pauseSession(s, T0 + HOUR)).toBe(s);
  });

  it('retomar ou pausar duas vezes não muda nada', () => {
    const s = start();
    expect(resumeSession(s, T0 + HOUR)).toBe(s);
    const paused = pauseSession(s, T0 + HOUR);
    expect(pauseSession(paused, T0 + 2 * HOUR)).toBe(paused);
  });

  it('o modo desenvolvedor acelera: ×12 faz 5h30 durarem 27,5 min reais', () => {
    const s = start({}, 12);
    expect(remainingMs(s, T0 + 27.5 * MS_MINUTE)).toBe(0);
    expect(elapsedMs(s, T0 + 5 * MS_MINUTE)).toBe(60 * MS_MINUTE); // 5 min reais = 1 h de prova
  });
});

describe('fim do simulado', () => {
  it('terminar por tempo: concluído, com a duração planejada, mesmo que o app só abra horas depois', () => {
    const ended = endSession(start(), T0 + 9 * HOUR);
    expect(ended.endedAt).toBe(T0 + 5.5 * HOUR);
    expect(outcomeOf(ended)).toEqual({ actualMinutes: 330, completed: true });
  });

  it('encerrar antes: interrompido, com os minutos usados', () => {
    const ended = endSession(start(), T0 + 100 * MS_MINUTE);
    expect(isOver(ended, T0 + 200 * MS_MINUTE)).toBe(true);
    expect(outcomeOf(ended)).toEqual({ actualMinutes: 100, completed: false });
    expect(remainingMs(ended, T0 + 9 * HOUR)).toBe(230 * MS_MINUTE); // congelado no instante do fim
  });

  it('encerrar durante uma pausa não conta o tempo parado', () => {
    let s = pauseSession(start(), T0 + HOUR);
    s = endSession(s, T0 + 2 * HOUR);
    expect(outcomeOf(s)).toEqual({ actualMinutes: 60, completed: false });
  });

  it('terminar por tempo com aceleração é concluído (sem erro de ponto flutuante)', () => {
    for (const speed of [12, 60]) {
      const s = start({}, speed);
      const ended = endSession(s, T0 + (330 * MS_MINUTE) / speed + 1);
      expect(outcomeOf(ended), `×${speed}`).toEqual({ actualMinutes: 330, completed: true });
    }
  });

  it('o "pular" do modo desenvolvedor conta como concluído com a duração toda', () => {
    const ended = endSession(start(), T0 + 5 * MS_MINUTE);
    expect(outcomeOf(ended, true)).toEqual({ actualMinutes: 330, completed: true });
  });

  it('encerrar duas vezes mantém o primeiro fim', () => {
    const ended = endSession(start(), T0 + HOUR);
    expect(endSession(ended, T0 + 2 * HOUR)).toBe(ended);
  });
});

describe('avisos agendados', () => {
  it('ENEM Dia 1 (5h30): 1 h, 30 min e 10 min antes do fim e o FIM do tempo, em horário real', () => {
    const alerts = upcomingAlerts(start(), T0);
    expect(alerts.map(a => a.id)).toEqual(['h1', 'm30', 'm10', 'end']);
    expect(alerts.map(a => a.at)).toEqual([T0 + 270 * MS_MINUTE, T0 + 300 * MS_MINUTE, T0 + 320 * MS_MINUTE, T0 + 330 * MS_MINUTE]);
  });

  it('só os que ainda estão por vir: simulado de 45 min não tem aviso de 1 h; o de 20 min só tem o de 10 min e o fim', () => {
    expect(upcomingAlerts(start({ durationMinutes: 45 }), T0).map(a => a.id)).toEqual(['m30', 'm10', 'end']);
    expect(upcomingAlerts(start({ durationMinutes: 20 }), T0).map(a => a.id)).toEqual(['m10', 'end']);
    expect(upcomingAlerts(start({ durationMinutes: 10 }), T0).map(a => a.id)).toEqual(['end']); // 10 min exatos: o de 10 min seria no instante zero
  });

  it('retomar depois de uma pausa desloca os horários pelo tempo parado', () => {
    let s = pauseSession(start(), T0 + HOUR);
    expect(upcomingAlerts(s, T0 + HOUR)).toEqual([]); // pausado: nenhum aviso agendado
    s = resumeSession(s, T0 + 2 * HOUR);
    expect(upcomingAlerts(s, T0 + 2 * HOUR).find(a => a.id === 'm10')?.at).toBe(T0 + 2 * HOUR + 260 * MS_MINUTE);
  });

  it('aviso que já passou não é reagendado', () => {
    const alerts = upcomingAlerts(start(), T0 + 290 * MS_MINUTE); // faltam 40 min
    expect(alerts.map(a => a.id)).toEqual(['m30', 'm10', 'end']);
  });

  it('sessão encerrada não agenda nada', () => {
    expect(upcomingAlerts(endSession(start(), T0 + HOUR), T0 + HOUR)).toEqual([]);
  });

  it('com aceleração os horários reais encolhem na mesma proporção', () => {
    const alerts = upcomingAlerts(start({}, 12), T0);
    expect(alerts.find(a => a.id === 'h1')?.at).toBe(T0 + 22.5 * MS_MINUTE); // 270 min de prova ÷ 12
    expect(alerts.find(a => a.id === 'm10')?.at).toBeCloseTo(T0 + (320 * MS_MINUTE) / 12, 3);
  });
});

describe('aviso dentro do app', () => {
  const left = (min: number) => min * MS_MINUTE;

  it('mostra o aviso quando o tempo acaba de cruzar o limite e não repete', () => {
    let r = milestonesToAnnounce(left(60) + 1000, new Set());
    expect(r.announce).toBeNull();
    r = milestonesToAnnounce(left(60) - 1000, r.fired);
    expect(r.announce?.label).toBe('Falta 1 hora');
    r = milestonesToAnnounce(left(60) - 2000, r.fired);
    expect(r.announce).toBeNull();
  });

  it('com a aceleração do modo dev, a janela de "acabou de passar" cresce junto (um quadro pula 15 s de prova a ×60)', () => {
    // a ×60 cada quadro de 250 ms avança 15 s de prova: cruzar o limite 12 s "depois" ainda é cruzar agora
    expect(milestonesToAnnounce(left(30) - 12_000, new Set(['h1']), 60).announce?.label).toBe('Faltam 30 minutos');
    expect(milestonesToAnnounce(left(30) - 12_000, new Set(['h1']), 1).announce).toBeNull();
  });

  it('o que passou com o app fechado (já tocou como notificação) é marcado em silêncio', () => {
    const r = milestonesToAnnounce(left(25), new Set());
    expect(r.announce).toBeNull();
    expect([...r.fired].sort()).toEqual(['h1', 'm30']);
  });
});

describe('persistência da sessão', () => {
  it('ida e volta pelo JSON', () => {
    const s: SimuladoSession = pauseSession(start({ strictMode: false }, 12), T0 + HOUR);
    expect(parseSession(serializeSession(s))).toEqual(s);
  });

  it('valor ausente, estragado ou de outro formato = sem simulado em andamento', () => {
    expect(parseSession(undefined)).toBeNull();
    expect(parseSession('')).toBeNull();
    expect(parseSession('{não é json')).toBeNull();
    expect(parseSession('[]')).toBeNull();
    expect(parseSession(JSON.stringify({ ...start(), startedAt: 'ontem' }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...start(), speed: 0 }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...start(), template: { id: 'x' } }))).toBeNull();
    expect(parseSession(JSON.stringify({ ...start(), template: template({ durationMinutes: -5 }) }))).toBeNull();
  });
});
