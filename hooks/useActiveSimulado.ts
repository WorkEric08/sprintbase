import { useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { SimuladoSession } from '../types';
import { SETTING_KEYS } from '../utils/settings';
import { parseSession } from '../utils/simulado';

/**
 * Só leitura: o simulado gravado (em andamento, ou encerrado e ainda sem registro). Fica à parte de
 * useSimuladoSession para a barra de abas (primeiro arquivo do app) não puxar o agendamento de avisos.
 */
export function useActiveSimulado(): SimuladoSession | null {
  const { settings } = useAppData();
  const raw = settings[SETTING_KEYS.simuladoActive];
  return useMemo(() => parseSession(raw), [raw]);
}
