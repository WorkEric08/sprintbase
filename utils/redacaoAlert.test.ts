import { describe, expect, it } from 'vitest';
import { REDACAO_ALERT_ID, REDACAO_CHANNEL_ID, endNotification } from './redacaoAlert';

const T0 = 1_700_000_000_000;
const MIN = 60_000;

describe('aviso de fim do cronômetro da redação', () => {
  it('um aviso, para o instante em que os minutos restantes acabam, tocando com o aparelho parado', () => {
    const [n] = endNotification(90 * MIN, T0);
    expect(n.id).toBe(REDACAO_ALERT_ID);
    expect(n.channelId).toBe(REDACAO_CHANNEL_ID);
    expect(n.schedule.at.getTime()).toBe(T0 + 90 * MIN);
    expect(n.schedule.allowWhileIdle).toBe(true);
    expect(n.body).toMatch(/tempo da redação acabou/);
  });

  it('retomar com menos tempo agenda mais cedo (o mesmo id substitui o anterior)', () => {
    expect(endNotification(25 * MIN, T0 + 60 * MIN)[0].schedule.at.getTime()).toBe(T0 + 85 * MIN);
  });

  it('sem tempo restante não há aviso', () => {
    expect(endNotification(0, T0)).toEqual([]);
    expect(endNotification(-5, T0)).toEqual([]);
  });

  it('alarme exato só com a permissão (senão o plugin abriria a tela de configurações do Android sozinho)', () => {
    expect(endNotification(MIN, T0)[0].isExactNotification).toBe(false);
    expect(endNotification(MIN, T0, true)[0].isExactNotification).toBe(true);
  });
});
