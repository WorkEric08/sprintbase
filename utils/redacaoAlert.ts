/**
 * Aviso de fim do cronômetro da redação (pura). O agendamento de verdade está em services/redacaoAlert.ts.
 * Um só aviso, com id fixo: agendar de novo substitui, nunca duplica.
 */

export const REDACAO_CHANNEL_ID = 'redacao';
export const REDACAO_ALERT_ID = 72001;

export interface RedacaoEndNotification {
  id: number;
  title: string;
  body: string;
  channelId: string;
  isExactNotification: boolean;
  schedule: { at: Date; allowWhileIdle: true };
}

/**
 * O aviso de "acabou o tempo", para daqui a `remainingMs`. Nenhum se já acabou (`remainingMs <= 0`).
 * `exact`: o app já tem a permissão "Alarmes e lembretes" (sem ela o aviso é pedido como inexato, para o plugin não
 * abrir a tela de configurações do Android sozinho).
 */
export function endNotification(remainingMs: number, now: number, exact = false): RedacaoEndNotification[] {
  if (remainingMs <= 0) return [];
  return [{
    id: REDACAO_ALERT_ID,
    title: 'Redação',
    body: 'O tempo da redação acabou. Abra o app para concluir e se autoavaliar.',
    channelId: REDACAO_CHANNEL_ID,
    isExactNotification: exact,
    schedule: { at: new Date(now + remainingMs), allowWhileIdle: true },
  }];
}
