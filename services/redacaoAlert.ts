import { REDACAO_ALERT_ID, REDACAO_CHANNEL_ID, endNotification } from '../utils/redacaoAlert';
import { cancelLocal, scheduleLocal } from './notify';

const CHANNEL = {
  id: REDACAO_CHANNEL_ID,
  name: 'Fim do tempo da redação',
  description: 'Aviso quando os 90 minutos da redação acabam',
};

/** Agenda o aviso de fim do cronômetro para daqui a `remainingMs` (substitui o anterior). */
export function scheduleRedacaoEnd(remainingMs: number, now: number = Date.now()) {
  return scheduleLocal(CHANNEL, [REDACAO_ALERT_ID], exact => endNotification(remainingMs, now, exact));
}

/** Cancela o aviso (pausa, conclusão ou saída da tela). */
export const cancelRedacaoEnd = (): Promise<void> => cancelLocal([REDACAO_ALERT_ID]);
