import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SimuladoTemplate } from '../types';
import { MS_MINUTE, createSession, pauseSession, resumeSession } from './simulado';
import { ALERT_CHANNEL_ID, ALL_ALERT_IDS, alertNotifications } from './simuladoAlerts';

const T0 = 1_700_000_000_000;
const HOUR = 60 * MS_MINUTE;
const enem: SimuladoTemplate = {
  id: 'enem-dia1', name: 'ENEM — Dia 1', durationMinutes: 330, strictMode: true, hasRedacao: true, areas: [],
};

describe('notificações do simulado', () => {
  it('ao começar o ENEM Dia 1: quatro avisos, 1 h, 30 min e 10 min antes do fim e o fim do tempo, com os horários reais', () => {
    const list = alertNotifications(createSession(enem, T0), T0);
    expect(list.map(n => n.body)).toEqual([
      'Falta 1 hora para o fim do simulado.',
      'Faltam 30 minutos para o fim do simulado.',
      'Faltam 10 minutos para o fim do simulado.',
      'O tempo do simulado acabou.',
    ]);
    expect(list.map(n => n.schedule.at.getTime())).toEqual([T0 + 270 * MS_MINUTE, T0 + 300 * MS_MINUTE, T0 + 320 * MS_MINUTE, T0 + 330 * MS_MINUTE]);
    expect(list.every(n => n.title === 'ENEM — Dia 1' && n.channelId === ALERT_CHANNEL_ID)).toBe(true);
  });

  it('toca mesmo com o aparelho parado (allowWhileIdle) e os ids são fixos, para agendar de novo substituir em vez de duplicar', () => {
    const list = alertNotifications(createSession(enem, T0), T0);
    expect(list.every(n => n.schedule.allowWhileIdle)).toBe(true);
    expect(list.map(n => n.id)).toEqual(ALL_ALERT_IDS);
    expect(new Set(ALL_ALERT_IDS).size).toBe(4);
  });

  it('pausar não deixa nenhum aviso (o serviço cancela); retomar agenda de novo com os horários deslocados', () => {
    let s = pauseSession({ ...createSession(enem, T0), template: { ...enem, strictMode: false } }, T0 + HOUR);
    expect(alertNotifications(s, T0 + HOUR)).toEqual([]);
    s = resumeSession(s, T0 + 2 * HOUR);
    const list = alertNotifications(s, T0 + 2 * HOUR);
    expect(list).toHaveLength(4);
    expect(list[2].schedule.at.getTime()).toBe(T0 + 2 * HOUR + 260 * MS_MINUTE);
  });

  it('só os avisos que ainda cabem: uma prova de 20 minutos avisa aos 10 e no fim', () => {
    const list = alertNotifications(createSession({ ...enem, durationMinutes: 20 }, T0), T0);
    expect(list.map(n => n.id)).toEqual([ALL_ALERT_IDS[2], ALL_ALERT_IDS[3]]);
  });

  it('alarme exato só com a permissão: por padrão pede inexato, para o plugin não abrir a tela de configurações do Android sozinho', () => {
    const s = createSession(enem, T0);
    expect(alertNotifications(s, T0).every(n => n.isExactNotification === false)).toBe(true);
    expect(alertNotifications(s, T0, true).every(n => n.isExactNotification === true)).toBe(true);
  });
});

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

describe('integração nativa dos avisos e da tela ligada', () => {
  it('@capacitor/local-notifications é usado SÓ no serviço dos avisos do simulado, e carregado sob demanda', () => {
    const service = read('services/simuladoAlerts.ts');
    expect(service).toMatch(/await import\('@capacitor\/local-notifications'\)/);
    expect(service).not.toMatch(/^import (?!type ).* from '@capacitor\/local-notifications'/m); // só `import type` (apagado no build)
    for (const file of ['App.tsx', 'index.tsx', 'contexts/AppDataContext.tsx', 'utils/native.ts', 'services/keepAwake.ts']) {
      expect(read(file), file).not.toContain('local-notifications');
    }
  });

  it('o plugin (um Proxy do Capacitor) nunca é devolvido de uma função async: o await o trataria como "thenable" e nada seria agendado', () => {
    const service = read('services/simuladoAlerts.ts');
    expect(service).not.toMatch(/\)\)\.LocalNotifications/); // (await import(...)).LocalNotifications
    expect(service).toMatch(/const \{ LocalNotifications \} = await import\(/);
    expect(service).not.toMatch(/return LocalNotifications|=> LocalNotifications/);
  });

  it('os alarmes são agendados ao começar e ao retomar e cancelados ao pausar e ao encerrar', () => {
    const hook = read('hooks/useSimuladoSession.ts');
    expect(hook).toMatch(/const start[\s\S]*?syncAlerts\(next\)/);
    expect(hook).toMatch(/const resume[\s\S]*?syncAlerts\(next\)/);
    expect(hook).toMatch(/const pause[\s\S]*?cancelSimuladoAlerts\(\)/);
    expect(hook).toMatch(/const end[\s\S]*?cancelSimuladoAlerts\(\)/);
    expect(hook).toMatch(/const clear[\s\S]*?cancelSimuladoAlerts\(\)/);
  });

  it('o plugin de notificações está no pacote Android e o ícone das notificações existe e é o configurado', () => {
    expect(read('package.json')).toContain('"@capacitor/local-notifications"');
    expect(read('android/capacitor.settings.gradle')).toContain("capacitor-local-notifications");
    expect(existsSync(new URL('../android/app/src/main/res/drawable/ic_stat_sprint.xml', import.meta.url))).toBe(true);
    expect(read('capacitor.config.ts')).toMatch(/LocalNotifications:\s*\{[^}]*smallIcon: 'ic_stat_sprint'/);
  });

  it('a permissão de notificações do Android 13+ vem do plugin, e o plugin da tela ligada está registrado na MainActivity', () => {
    expect(read('node_modules/@capacitor/local-notifications/android/src/main/AndroidManifest.xml'))
      .toContain('android.permission.POST_NOTIFICATIONS');
    expect(read('android/app/src/main/java/com/workeric08/sprint/MainActivity.java')).toContain('registerPlugin(KeepAwakePlugin.class)');
    const java = read('android/app/src/main/java/com/workeric08/sprint/KeepAwakePlugin.java');
    expect(java).toContain('FLAG_KEEP_SCREEN_ON');
    expect(java).toContain('@CapacitorPlugin(name = "KeepAwake")');
  });
});
