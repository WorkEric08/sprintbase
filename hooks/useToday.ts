import { useEffect, useState } from 'react';
import { todayKey } from '../utils/dateUtils';

/**
 * Chave de hoje ("YYYY-MM-DD", fuso local) que acompanha a virada do dia.
 * No celular o app costuma ficar aberto de um dia para o outro; sem isto a ofensiva e o calendário
 * continuariam achando que é "ontem" até alguém recarregar. Reavalia ao voltar para o app
 * (visibilidade/foco) e a cada minuto com ele aberto.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());

  useEffect(() => {
    const refresh = () => setToday(prev => {
      const next = todayKey();
      return next === prev ? prev : next;
    });
    const id = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
