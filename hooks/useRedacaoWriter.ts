import { useCallback, useEffect, useRef, useState } from 'react';
import { RedacaoCompetencyScores, RedacaoSession, RedacaoTheme } from '../types';
import { uid } from '../utils/id';
import {
  WritingClock, Writing, buildDraft, buildFinished, clockStarted, clockStopAt, clockStopped, countWords, elapsedOf,
  remainingOf, writingFromDraft,
} from '../utils/redacao';
import { useAppPause } from './useAppPause';
import { useKeepAwake } from './useKeepAwake';

interface Options {
  theme: RedacaoTheme;
  paper: boolean;
  /** Rascunho a continuar: o texto volta, e o cronômetro volta PARADO no tempo salvo. */
  resume?: RedacaoSession;
  isDevMode: boolean;
  /** Salvamento automático (rascunho). */
  onSaveDraft: (draft: RedacaoSession) => void;
  /** Redação concluída. */
  onFinish: (session: RedacaoSession) => void;
  /** Sair guardando o rascunho. */
  onClose: () => void;
}

const AUTOSAVE_MS = 5000;
/** Enquanto o cronômetro corre, o tempo acumulado também vai ao banco: o rascunho volta do ponto certo. */
const CLOCK_SAVE_MS = 30_000;

/**
 * Tudo que o editor (digital) e o modo papel têm em comum: cronômetro de 90 min, rascunho salvo sozinho, avaliação final
 * e saída. O rascunho é gravado: 5 s depois de parar de digitar, a cada 30 s com o cronômetro correndo, ao pausar e
 * retomar, ao sair da tela e quando o app vai para segundo plano (o Android pode matar o processo logo em seguida).
 */
export function useRedacaoWriter({ theme, paper, resume, isDevMode, onSaveDraft, onFinish, onClose }: Options) {
  const start = useRef<Writing>(resume ? writingFromDraft(resume) : {
    id: uid(), themeId: theme.id, themeTitle: theme.title, startedAt: Date.now(), text: '', elapsedMs: 0, paper,
  }).current;

  const textRef = useRef(start.text);
  const [words, setWords] = useState(() => countWords(start.text));
  // Redação nova no editor digital começa correndo; papel e rascunho retomado começam parados (a pessoa toca em iniciar).
  const [clock, setClock] = useState<WritingClock>(() =>
    resume || paper ? clockStopped(start.elapsedMs) : clockStarted(clockStopped(), Date.now()));
  const clockRef = useRef(clock);
  clockRef.current = clock;
  /** Troca o cronômetro já no ref (quem salva logo em seguida enxerga o valor novo, sem esperar a renderização). */
  const updateClock = useCallback((change: (c: WritingClock) => WritingClock) => {
    const next = change(clockRef.current);
    clockRef.current = next;
    setClock(next);
  }, []);
  const [now, setNow] = useState(() => Date.now());
  const [showScoring, setShowScoring] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(resume?.lastSavedAt ?? null);

  const mounted = useRef(true);
  const doneRef = useRef(false);        // concluída: nenhum salvamento de rascunho pode vir depois
  const everRan = useRef(!!resume || !paper); // papel só vira rascunho depois de o cronômetro começar
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onSaveDraft, onFinish, onClose });
  callbacks.current = { onSaveDraft, onFinish, onClose };

  const running = clock.since !== null;
  const elapsedMs = elapsedOf(clock, now);
  const remainingMs = remainingOf(clock, now);

  const snapshot = useCallback((at: number): Writing => ({
    ...start, text: textRef.current, elapsedMs: elapsedOf(clockRef.current, at),
  }), [start]);

  /** Grava o rascunho agora (seguro para chamar várias vezes). Não grava redação vazia que nunca existiu. */
  const flush = useCallback(() => {
    if (doneRef.current) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const at = Date.now();
    const hasWork = textRef.current.trim() !== '' || !!resume || (paper && everRan.current);
    if (!hasWork) return;
    callbacks.current.onSaveDraft(buildDraft(snapshot(at), at));
    if (mounted.current) setLastSavedAt(at);
  }, [paper, resume, snapshot]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  useAppPause(() => flushRef.current());

  // Ao sair da tela (ou do app, no navegador) o que há de rascunho vai ao banco.
  useEffect(() => {
    mounted.current = true;
    return () => {
      flushRef.current();
      mounted.current = false;
    };
  }, []);

  // Relógio da tela e salvamento periódico do tempo.
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 500);
    const save = setInterval(() => flushRef.current(), CLOCK_SAVE_MS);
    const refresh = () => setNow(Date.now());
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [running]);

  useKeepAwake(running);

  // Acabaram os 90 minutos: para o cronômetro e pede a avaliação.
  useEffect(() => {
    if (running && remainingMs <= 0) {
      updateClock(c => clockStopAt(c, Date.now()));
      setShowScoring(true);
    }
  }, [running, remainingMs, updateClock]);

  const onInput = useCallback((text: string) => {
    textRef.current = text;
    setWords(countWords(text));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), AUTOSAVE_MS);
  }, []);

  const begin = useCallback(() => {
    everRan.current = true;
    updateClock(c => clockStarted(c, Date.now()));
    setNow(Date.now());
    flushRef.current();
  }, [updateClock]);

  const pause = useCallback(() => {
    updateClock(c => clockStopAt(c, Date.now()));
    flushRef.current();
  }, [updateClock]);

  /** "Concluir": para o cronômetro e abre a avaliação. */
  const finish = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    updateClock(c => clockStopAt(c, Date.now()));
    setShowScoring(true);
  }, [updateClock]);

  /** Volta da avaliação para o texto (o cronômetro continua parado). */
  const backToWriting = useCallback(() => setShowScoring(false), []);

  const save = useCallback((scores: RedacaoCompetencyScores | null, notes: string) => {
    doneRef.current = true;
    const at = Date.now();
    callbacks.current.onFinish(buildFinished(snapshot(at), scores, notes, at, isDevMode));
  }, [isDevMode, snapshot]);

  const exit = useCallback(() => {
    flushRef.current();
    callbacks.current.onClose();
  }, []);

  return {
    initialText: start.text, getText: () => textRef.current, words, running, elapsedMs, remainingMs, lastSavedAt,
    showScoring, showExit, setShowExit, onInput, begin, pause, finish, backToWriting, save, exit,
    hasStarted: elapsedMs > 0 || running,
  };
}
