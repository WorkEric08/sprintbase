import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { SimuladoSession, SimuladoTemplate } from '../types';
import { AlertsResult, cancelSimuladoAlerts, openExactAlarmSettings, scheduleSimuladoAlerts } from '../services/simuladoAlerts';
import { createSession, endSession, isPaused, pauseSession, resumeSession, serializeSession } from '../utils/simulado';
import { SETTING_KEYS } from '../utils/settings';
import { useActiveSimulado } from './useActiveSimulado';

/**
 * O simulado em andamento. Vive em `settings` (chave `simulado_active`), então sobrevive a fechar o app e a o Android
 * matar o processo; o relógio todo é derivado de horários reais (utils/simulado.ts).
 *
 * Os avisos (notificações agendadas) acompanham o estado: agendados ao começar e ao retomar, cancelados ao pausar e ao
 * encerrar. Agendar de novo substitui os anteriores (ids fixos), então reabrir o app com o simulado rodando é seguro.
 */
export function useSimuladoSession() {
  const { setSetting, removeSetting } = useAppData();
  const session = useActiveSimulado();
  const [alerts, setAlerts] = useState<AlertsResult>({ status: 'on', exact: true });

  // As ações leem sempre a sessão mais recente, mesmo chamadas de dentro de timers.
  const ref = useRef<SimuladoSession | null>(session);
  ref.current = session;

  const save = useCallback((next: SimuladoSession) => {
    ref.current = next;
    setSetting(SETTING_KEYS.simuladoActive, serializeSession(next));
  }, [setSetting]);

  const syncAlerts = useCallback(async (s: SimuladoSession) => {
    setAlerts(await scheduleSimuladoAlerts(s));
  }, []);

  // Reabriu o app com o simulado rodando: reconfirma os avisos (e a permissão) sem duplicar nada.
  const resumedOnce = useRef(false);
  useEffect(() => {
    if (resumedOnce.current || !session) return;
    resumedOnce.current = true;
    if (session.endedAt === null && !isPaused(session)) void syncAlerts(session);
  }, [session, syncAlerts]);

  // A pessoa foi à tela "Alarmes e lembretes" e voltou: agenda de novo para os avisos passarem a ser exatos.
  useEffect(() => {
    if (alerts.status !== 'on' || alerts.exact) return;
    const onVisible = () => {
      const cur = ref.current;
      if (document.visibilityState === 'visible' && cur && cur.endedAt === null && !isPaused(cur)) void syncAlerts(cur);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [alerts, syncAlerts]);

  const allowExact = useCallback(() => { void openExactAlarmSettings(); }, []);

  const start = useCallback((template: SimuladoTemplate, speed = 1) => {
    const next = createSession(template, Date.now(), speed);
    save(next);
    resumedOnce.current = true;
    void syncAlerts(next);
  }, [save, syncAlerts]);

  const pause = useCallback(() => {
    const cur = ref.current;
    if (!cur) return;
    const next = pauseSession(cur, Date.now());
    if (next === cur) return;
    save(next);
    void cancelSimuladoAlerts();
  }, [save]);

  const resume = useCallback(() => {
    const cur = ref.current;
    if (!cur) return;
    const next = resumeSession(cur, Date.now());
    if (next === cur) return;
    save(next);
    void syncAlerts(next);
  }, [save, syncAlerts]);

  /** Acabou o tempo ou a pessoa encerrou: congela o relógio e abre o registro. */
  const end = useCallback(() => {
    const cur = ref.current;
    if (!cur || cur.endedAt !== null) return;
    save(endSession(cur, Date.now()));
    void cancelSimuladoAlerts();
  }, [save]);

  /** O registro foi salvo (ou dispensado): não há mais simulado em andamento. */
  const clear = useCallback(() => {
    ref.current = null;
    removeSetting(SETTING_KEYS.simuladoActive);
    void cancelSimuladoAlerts();
  }, [removeSetting]);

  return { session, alerts, allowExact, start, pause, resume, end, clear };
}
