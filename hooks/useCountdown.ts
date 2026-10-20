import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Contagem regressiva baseada em horário real (não em contagem de ticks).
 * Se a aba/app ficar em segundo plano e o navegador pausar os timers, o tempo restante
 * continua correto ao voltar — o contador antigo (decrementar 1 por segundo) congelava.
 *
 * Começa rodando. `onFinish` dispara uma única vez quando chega a zero.
 */
export function useCountdown(totalSeconds: number, onFinish: () => void) {
  const totalMs = totalSeconds * 1000;
  const [endAt, setEndAt] = useState<number | null>(() => Date.now() + totalMs); // null = pausado
  const [pausedLeftMs, setPausedLeftMs] = useState(totalMs);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const leftMs = finished ? 0 : endAt !== null ? Math.max(0, endAt - now) : pausedLeftMs;

  useEffect(() => {
    if (endAt === null || finishedRef.current) return;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt && !finishedRef.current) {
        finishedRef.current = true;
        setFinished(true);
        setEndAt(null);
        onFinishRef.current();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endAt]);

  const pause = useCallback(() => {
    if (endAt === null || finishedRef.current) return;
    setPausedLeftMs(Math.max(0, endAt - Date.now()));
    setEndAt(null);
  }, [endAt]);

  const resume = useCallback(() => {
    if (endAt !== null || finishedRef.current) return;
    setEndAt(Date.now() + pausedLeftMs);
    setNow(Date.now());
  }, [endAt, pausedLeftMs]);

  return {
    secondsLeft: Math.ceil(leftMs / 1000),
    /** 1 → 0 ao longo da contagem. */
    fraction: totalMs > 0 ? leftMs / totalMs : 0,
    isRunning: endAt !== null,
    finished,
    pause,
    resume,
  };
}
