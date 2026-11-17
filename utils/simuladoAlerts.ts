import { SimuladoSession } from '../types';
import { ALERTS, AlertId, ScheduledAlert, upcomingAlerts } from './simulado';

/**
 * Montagem (pura) das notificações do simulado. O agendamento de verdade está em services/simuladoAlerts.ts.
 *
 * Os ids são fixos: agendar de novo SUBSTITUI o aviso anterior do mesmo tipo, então repetir a chamada
 * (ao retomar a pausa, ao reabrir o app depois de o Android matá-lo) nunca duplica nada.
 */

export const ALERT_CHANNEL_ID = 'simulado';

const ID_BASE = 71000;
const ID_OF: Record<AlertId, number> = { h1: ID_BASE + 1, m30: ID_BASE + 2, m10: ID_BASE + 3, end: ID_BASE + 4 };

export const ALL_ALERT_IDS: number[] = ALERTS.map(m => ID_OF[m.id]);

export interface AlertNotification {
  id: number;
  title: string;
  body: string;
  channelId: string;
  /** Alarme exato só quando o Android permite; senão inexato, SEM abrir a tela de configurações do sistema sozinho. */
  isExactNotification: boolean;
  schedule: { at: Date; allowWhileIdle: true };
}

const body = (a: ScheduledAlert) => (a.id === 'end' ? 'O tempo do simulado acabou.' : `${a.label} para o fim do simulado.`);

/**
 * As notificações que valem agora: só as que ainda estão por vir, sem nenhuma enquanto pausado ou encerrado.
 * `exact`: o app já tem a permissão "Alarmes e lembretes". Sem isso o plugin abriria a tela de configurações do
 * Android a cada agendamento; por isso o padrão é pedir alarme inexato e deixar a escolha para um botão no cronômetro.
 */
export function alertNotifications(session: SimuladoSession, now: number, exact = false): AlertNotification[] {
  return upcomingAlerts(session, now).map(a => ({
    id: ID_OF[a.id],
    title: session.template.name,
    body: body(a),
    channelId: ALERT_CHANNEL_ID,
    isExactNotification: exact,
    schedule: { at: new Date(a.at), allowWhileIdle: true },
  }));
}
