import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { BlockLog, BlockType, PostBlockData, Subject, SubjectInput } from '../types';
import { uid } from '../utils/id';
import { syncSystemBars } from '../utils/native';

export type Theme = 'light' | 'dark';

interface AppData {
  loading: boolean;
  subjects: Subject[];
  blockLogs: BlockLog[];
  userName: string;
  theme: Theme;
  addSubject: (input: SubjectInput) => void;
  updateSubject: (id: string, input: SubjectInput) => void;
  deleteSubject: (id: string) => void;
  resetSubjectBlocks: (id: string) => void;
  /** Soma 1 bloco concluído à matéria (respeita a meta `blockCount`). */
  completeBlock: (subjectId: string, type: BlockType) => void;
  /** Grava o registro pós-bloco (matéria denormalizada no log, como no original). */
  saveBlockLog: (subjectId: string, data: PostBlockData, blockType: BlockType) => void;
  setUserName: (name: string) => void;
  setTheme: (theme: Theme) => void;
}

const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de <AppDataProvider>');
  return ctx;
}

function logError(what: string, e: unknown) {
  console.error(`Falha ao ${what}`, e);
}

/**
 * Fonte única de dados do app. Toda tela lê e grava por aqui — não há hooks de dados
 * duplicados, então Ciclo, Sprint e Progresso sempre veem o mesmo estado.
 *
 * Padrão: atualiza o estado na hora (otimista) e persiste no Dexie em seguida.
 * Os `useRef` espelham o estado mais recente para que callbacks de timers (que
 * capturam closures antigas) nunca operem sobre dados defasados.
 */
export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjectsState] = useState<Subject[]>([]);
  const [blockLogs, setBlockLogsState] = useState<BlockLog[]>([]);
  const [userName, setUserNameState] = useState('');
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const subjectsRef = useRef<Subject[]>([]);
  const blockLogsRef = useRef<BlockLog[]>([]);

  const commitSubjects = useCallback((next: Subject[]) => {
    subjectsRef.current = next;
    setSubjectsState(next);
  }, []);

  const commitBlockLogs = useCallback((next: BlockLog[]) => {
    blockLogsRef.current = next;
    setBlockLogsState(next);
  }, []);

  // ── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subjectRows, logRows, themeRow, nameRow] = await Promise.all([
          db.subjects.toArray(),
          db.blockLogs.orderBy('timestamp').reverse().toArray(),
          db.settings.get('theme'),
          db.settings.get('user_name'),
        ]);
        if (cancelled) return;
        // Ordem de criação; matérias antigas (sem createdAt) mantêm a ordem do banco.
        commitSubjects([...subjectRows].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)));
        commitBlockLogs(logRows);
        if (nameRow) setUserNameState(nameRow.value);
        if (themeRow && (themeRow.value === 'light' || themeRow.value === 'dark')) setThemeState(themeRow.value);
      } catch (e) {
        logError('carregar dados', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [commitSubjects, commitBlockLogs]);

  // ── Tema ────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#030712' : '#f9fafb');
    syncSystemBars(theme);
  }, [theme]);

  // ── Matérias ────────────────────────────────────────────────────────────
  const persistSubject = (subject: Subject) => {
    db.subjects.put(subject).catch(e => logError('salvar matéria', e));
  };

  const addSubject = useCallback((input: SubjectInput) => {
    const subject: Subject = { id: uid(), ...input, completedBlocks: [], createdAt: Date.now() };
    commitSubjects([...subjectsRef.current, subject]);
    persistSubject(subject);
  }, [commitSubjects]);

  const updateSubject = useCallback((id: string, input: SubjectInput) => {
    const current = subjectsRef.current.find(s => s.id === id);
    if (!current) return;
    const updated: Subject = { ...current, ...input };
    commitSubjects(subjectsRef.current.map(s => (s.id === id ? updated : s)));
    persistSubject(updated);
  }, [commitSubjects]);

  const deleteSubject = useCallback((id: string) => {
    commitSubjects(subjectsRef.current.filter(s => s.id !== id));
    db.subjects.delete(id).catch(e => logError('excluir matéria', e));
  }, [commitSubjects]);

  const resetSubjectBlocks = useCallback((id: string) => {
    const current = subjectsRef.current.find(s => s.id === id);
    if (!current) return;
    const updated: Subject = { ...current, completedBlocks: [] };
    commitSubjects(subjectsRef.current.map(s => (s.id === id ? updated : s)));
    persistSubject(updated);
  }, [commitSubjects]);

  const completeBlock = useCallback((subjectId: string, type: BlockType) => {
    const current = subjectsRef.current.find(s => s.id === subjectId);
    if (!current || current.completedBlocks.length >= current.blockCount) return;
    const updated: Subject = {
      ...current,
      completedBlocks: [...current.completedBlocks, { timestamp: Date.now(), type }],
    };
    commitSubjects(subjectsRef.current.map(s => (s.id === subjectId ? updated : s)));
    persistSubject(updated);
  }, [commitSubjects]);

  // ── Registros de bloco ──────────────────────────────────────────────────
  const saveBlockLog = useCallback((subjectId: string, data: PostBlockData, blockType: BlockType) => {
    const subject = subjectsRef.current.find(s => s.id === subjectId);
    if (!subject) return;
    const log: BlockLog = {
      id: uid(),
      subjectId,
      subjectTitle: subject.title,
      subjectColor: subject.color,
      timestamp: Date.now(),
      questionsTotal: data.questionsTotal,
      questionsCorrect: data.questionsCorrect,
      subtopic: data.subtopic,
      selfScore: data.selfScore,
      flaggedForReview: false,
      blockType,
    };
    commitBlockLogs([log, ...blockLogsRef.current]);
    db.blockLogs.put(log).catch(e => logError('salvar registro do bloco', e));
  }, [commitBlockLogs]);

  // ── Configurações ───────────────────────────────────────────────────────
  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    db.settings.put({ key: 'user_name', value: name }).catch(e => logError('salvar nome', e));
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    // Espelho em localStorage só para o script do index.html evitar flash de tema.
    try { localStorage.setItem('sprint_theme', next); } catch { /* ignorado */ }
    db.settings.put({ key: 'theme', value: next }).catch(e => logError('salvar tema', e));
  }, []);

  const value = useMemo<AppData>(() => ({
    loading, subjects, blockLogs, userName, theme,
    addSubject, updateSubject, deleteSubject, resetSubjectBlocks,
    completeBlock, saveBlockLog, setUserName, setTheme,
  }), [
    loading, subjects, blockLogs, userName, theme,
    addSubject, updateSubject, deleteSubject, resetSubjectBlocks,
    completeBlock, saveBlockLog, setUserName, setTheme,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};
