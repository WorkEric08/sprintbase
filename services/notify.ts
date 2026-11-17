import type { LocalNotificationsPlugin, ScheduleOptions } from '@capacitor/local-notifications';
import { isNative } from '../utils/platform';

/**
 * Notificações locais agendadas no sistema (@capacitor/local-notifications): a única porta de entrada do plugin no app.
 * Quem precisa de avisos (Simulado, Redação) monta os seus (funções puras em utils/) e entrega aqui.
 *
 * Por que agendar no sistema: com a tela apagada o Android suspende o WebView e o JavaScript deixa de rodar; o alarme
 * agendado é do sistema e toca mesmo assim. O plugin é carregado sob demanda e só no APK (na web não há como agendar nada
 * com o app fechado).
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

export interface ChannelDef {
  id: string;
  name: string;
  description: string;
}

type Notification = ScheduleOptions['notifications'][number];

/** Pede a permissão (Android 13+) se ainda não foi concedida. Chamado com a pessoa olhando a tela. */
async function ensurePermission(plugin: LocalNotificationsPlugin): Promise<boolean> {
  let { display } = await plugin.checkPermissions();
  if (display !== 'granted') ({ display } = await plugin.requestPermissions());
  return display === 'granted';
}

/**
 * Agenda `build(exact)` no canal dado, SUBSTITUINDO os avisos de `replaceIds` (ids fixos: agendar de novo nunca duplica).
 * Nunca lança: um aviso a menos não pode derrubar o simulado nem a redação.
 */
export async function scheduleLocal(
  channel: ChannelDef, replaceIds: number[], build: (exact: boolean) => Notification[],
): Promise<AlertsResult> {
  if (!isNative) return { status: 'web', exact: false };
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    if (!(await ensurePermission(LocalNotifications))) return { status: 'denied', exact: false };
    const exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
    await LocalNotifications.createChannel({ ...channel, importance: 4, visibility: 1, vibration: true });
    await LocalNotifications.cancel({ notifications: replaceIds.map(id => ({ id })) });
    const notifications = build(exact);
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    return { status: 'on', exact };
  } catch (e) {
    console.error('Falha ao agendar avisos', e);
    return { status: 'denied', exact: false };
  }
}

export async function cancelLocal(ids: number[]): Promise<void> {
  if (!isNative) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  } catch (e) {
    console.error('Falha ao cancelar avisos', e);
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
