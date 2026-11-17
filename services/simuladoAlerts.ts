import type { LocalNotificationsPlugin } from '@capacitor/local-notifications';
import { SimuladoSession } from '../types';
import { isNative } from '../utils/platform';
import { ALERT_CHANNEL_ID, ALL_ALERT_IDS, alertNotifications } from '../utils/simuladoAlerts';

/**
 * Avisos do simulado como notificações locais agendadas no sistema (@capacitor/local-notifications).
 *
 * Por que não bastam os avisos dentro do app: com a tela apagada o Android suspende o WebView, e o JavaScript deixa de
 * rodar. O alarme agendado é do sistema e toca mesmo assim. O plugin é carregado sob demanda e só no APK (na web não há
 * como agendar nada com o app fechado), e é usado SÓ aqui.
 *
 *  - 'on'     avisos agendados (ou nada a agendar);
 *  - 'denied' a pessoa recusou a permissão de notificações: os avisos só aparecem dentro do app;
 *  - 'web'    navegador: os avisos só aparecem dentro do app.
 *
 * ARMADILHA: o plugin do Capacitor é um Proxy, e devolvê-lo de uma função `async` (ou dar `await` num valor que o
 * contém) faz o JavaScript perguntar se ele tem `.then`, o que o Capacitor trata como chamada nativa inexistente:
 * "LocalNotifications.then() is not implemented". Por isso o plugin nunca é retornado: cada função faz o seu próprio
 * `import()` e usa o plugin ali mesmo (scripts/e2e/simulado-nativo.mjs reprova se isso voltar).
 */
export type AlertsStatus = 'on' | 'denied' | 'web';

export interface AlertsResult {
  status: AlertsStatus;
  /**
   * Os avisos foram pedidos como alarme EXATO. Falso no Android 12+ enquanto "Alarmes e lembretes" estiver desligado
   * (padrão no Android 14): o sistema pode atrasar o aviso em alguns minutos com o aparelho parado.
   */
  exact: boolean;
}

/** Pede a permissão (Android 13+) se ainda não foi concedida. Chamado ao começar o simulado, com a pessoa olhando a tela. */
async function ensurePermission(plugin: LocalNotificationsPlugin): Promise<boolean> {
  let { display } = await plugin.checkPermissions();
  if (display !== 'granted') ({ display } = await plugin.requestPermissions());
  return display === 'granted';
}

/** Agenda os avisos que ainda estão por vir, substituindo os anteriores. Nunca lança: um aviso a menos não derruba o simulado. */
export async function scheduleSimuladoAlerts(session: SimuladoSession, now: number = Date.now()): Promise<AlertsResult> {
  if (!isNative) return { status: 'web', exact: false };
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    if (!(await ensurePermission(LocalNotifications))) return { status: 'denied', exact: false };
    const exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
    await LocalNotifications.createChannel({
      id: ALERT_CHANNEL_ID,
      name: 'Avisos do simulado',
      description: 'Aviso de 1 hora, 30 minutos e 10 minutos para o fim do simulado, e quando o tempo acabar',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    await LocalNotifications.cancel({ notifications: ALL_ALERT_IDS.map(id => ({ id })) });
    const notifications = alertNotifications(session, now, exact);
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    return { status: 'on', exact };
  } catch (e) {
    console.error('Falha ao agendar os avisos do simulado', e);
    return { status: 'denied', exact: false };
  }
}

/** Cancela os avisos (pausa, fim ou encerramento). */
export async function cancelSimuladoAlerts(): Promise<void> {
  if (!isNative) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: ALL_ALERT_IDS.map(id => ({ id })) });
  } catch (e) {
    console.error('Falha ao cancelar os avisos do simulado', e);
  }
}

/**
 * Abre a tela "Alarmes e lembretes" do Android para o app (só Android 12+; antes disso não faz nada). Ao voltar, quem
 * chamou agenda os avisos de novo, agora exatos. Se a pessoa DESLIGAR a permissão depois, o Android reinicia o app e
 * apaga os alarmes exatos: por isso o app reagenda sempre que a tela do simulado abre.
 */
export async function openExactAlarmSettings(): Promise<void> {
  if (!isNative) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.changeExactNotificationSetting();
  } catch (e) {
    console.error('Falha ao abrir as configurações de alarmes', e);
  }
}
