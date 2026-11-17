import { useCallback, useMemo } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { parseCompleted, serializeCompleted } from '../utils/redacao';
import { SETTING_KEYS } from '../utils/settings';

/**
 * Quais temas de redação já foram feitos. Fica em `settings` (entra no backup), separado do histórico: resetar a
 * categoria "Feitas" não apaga nenhuma redação. No app original isto morava no localStorage; o valor antigo é trazido
 * uma vez para o banco (AppDataContext).
 */
export function useCompletedThemes() {
  const { settings, setSetting } = useAppData();
  const raw = settings[SETTING_KEYS.completedRedacaoThemes];
  const completedIds = useMemo(() => parseCompleted(raw), [raw]);

  const markCompleted = useCallback((themeId: string) => {
    if (completedIds.has(themeId)) return;
    setSetting(SETTING_KEYS.completedRedacaoThemes, serializeCompleted(new Set([...completedIds, themeId])));
  }, [completedIds, setSetting]);

  /** Troca a lista inteira (usado para resetar e para desfazer o reset). */
  const replaceAll = useCallback((ids: ReadonlySet<string>) => {
    setSetting(SETTING_KEYS.completedRedacaoThemes, serializeCompleted(ids));
  }, [setSetting]);

  return { completedIds, markCompleted, replaceAll };
}
