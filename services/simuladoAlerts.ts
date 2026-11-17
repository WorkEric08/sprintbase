import { SimuladoSession } from '../types';
import { ALERT_CHANNEL_ID, ALL_ALERT_IDS, alertNotifications } from '../utils/simuladoAlerts';
import { AlertsResult, cancelLocal, openExactAlarmSettings, scheduleLocal } from './notify';

export type { AlertsResult, AlertsStatus } from './notify';
export { openExactAlarmSettings };

const CHANNEL = {
  id: ALERT_CHANNEL_ID,
  name: 'Avisos do simulado',
  description: 'Aviso de 1 hora, 30 minutos e 10 minutos para o fim do simulado, e quando o tempo acabar',
};

/** Agenda os avisos do simulado que ainda estão por vir, substituindo os anteriores. */
export function scheduleSimuladoAlerts(session: SimuladoSession, now: number = Date.now()): Promise<AlertsResult> {
  return scheduleLocal(CHANNEL, ALL_ALERT_IDS, exact => alertNotifications(session, now, exact));
}

/** Cancela os avisos (pausa, fim ou encerramento). */
export const cancelSimuladoAlerts = (): Promise<void> => cancelLocal(ALL_ALERT_IDS);
