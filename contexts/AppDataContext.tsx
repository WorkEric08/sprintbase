import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db';
import { BlockLog, BlockType, PostBlockData, RedacaoSession, SimuladoRecord, Subject, SubjectInput } from '../types';
import { uid } from '../utils/id';
import { syncSystemBars } from '../utils/native';
import { SETTING_KEYS } from '../utils/settings';
import { mark } from '../utils/perf';
import { THEME_BACKGROUND } from '../utils/theme';

export type Theme = 'light' | 'dark';

interface AppData {
  /** Matérias e configurações ainda carregando (é o que segura a tela de abertura). */
  loading: boolean;
  subjects: Subject[];
  /** Os registros de bloco chegam logo DEPOIS da primeira pintura; até lá `blockLogs` está vazio. */
  blockLogs: BlockLog[];
  logsLoaded: boolean;
  /** Simulados registrados, do mais recente para o mais antigo (também chegam depois da primeira pintura). */
  simulados: SimuladoRecord[];
  /** Redações (concluídas e rascunhos), da mais recente para a mais antiga (também chegam depois da primeira pintura). */
  redacoes: RedacaoSession[];
  userName: string;
  theme: Theme;
  /** Todas as configurações (tabela `settings`, chave → texto). Valores estruturados vão como JSON. */
  settings: Record<string, string>;
  addSubject: (input: SubjectInput) => void;
  updateSubject: (id: string, input: SubjectInput) => void;
  deleteSubject: (id: string) => void;
  resetSubjectBlocks: (id: string) => void;
  /** Soma 1 bloco concluído à matéria (respeita a meta `blockCount`). */
  completeBlock: (subjectId: string, type: BlockType) => void;
  /** Grava o registro pós-bloco (matéria denormalizada no log, como no original). */
  saveBlockLog: (subjectId: string, data: PostBlockData, blockType: BlockType) => void;
  /** Grava (ou substitui, pelo id) um simulado. Serve também para desfazer uma exclusão. */
  saveSimulado: (record: SimuladoRecord) => void;
  deleteSimulado: (id: string) => void;
  /** Grava (ou substitui, pelo id) uma redação. Serve ao salvamento automático do rascunho e a desfazer uma exclusão. */
  saveRedacao: (session: RedacaoSession) => void;
  deleteRedacao: (id: string) => void;
  setUserName: (name: string) => void;
  setTheme: (theme: Theme) => void;
  /** Grava uma configuração qualquer (otimista + Dexie). */
  setSetting: (key: string, value: string) => void;
  removeSetting: (key: string) => void;
}

const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData deve ser usado dentro de <AppDataProvider>');
  return ctx;
}

const byStartedAtDesc = (a: RedacaoSession, b: RedacaoSession) => b.startedAt - a.startedAt;

function logError(what: string, e: unknown) {
  console.error(`Falha ao ${what}`, e);
}

/**
 * O app original guardava a meta e as anotações do calendário no localStorage. Se este app for
 * aberto no mesmo endereço (mesma origem), traz esses valores para o banco uma única vez, para
 * entrarem no backup. Só preenche chaves que ainda não existem; o localStorage fica intocado.
 */
const LEGACY_LOCAL_STORAGE: [legacyKey: string, settingKey: string][] = [
  ['sprint_calendar_goal', SETTING_KEYS.calendarGoal],
  ['sprint_day_notes', SETTING_KEYS.dayNotes],
  ['sprint_completed_redacao_ids', SETTING_KEYS.completedRedacaoThemes],
];

function migrateLegacyLocalStorage(loaded: Record<string, string>) {
  for (const [legacyKey, settingKey] of LEGACY_LOCAL_STORAGE) {
    if (loaded[settingKey] !== undefined) continue;
    try {
      const raw = localStorage.getItem(legacyKey);
      if (!raw) continue;
      loaded[settingKey] = raw;
      db.settings.put({ key: settingKey, value: raw }).catch(e => logError(`migrar "${legacyKey}"`, e));
    } catch { /* localStorage indisponível */ }
  }
}

/** Espelho em localStorage só para o script do index.html evitar flash de tema no próximo boot. */
function mirrorTheme(theme: Theme) {
  try { localStorage.setItem('sprint_theme', theme); } catch { /* ignorado */ }
}

interface CriticalData {
  subjects: Subject[];
  settings: Record<string, string>;
}

let criticalLoad: Promise<CriticalData> | null = null;
/** Preenchido assim que a leitura termina: permite desenhar o primeiro quadro JÁ com os dados, sem passar pelo "carregando". */
let criticalResult: CriticalData | null = null;
let logsLoad: Promise<BlockLog[]> | null = null;

/**
 * O que o Ciclo precisa para desenhar a primeira tela: matérias e configurações (poucas dezenas de linhas).
 * Roda uma única vez e é reaproveitado por quem pedir de novo (por exemplo, o React.StrictMode em dev).
 */
function loadCritical(): Promise<CriticalData> {
  criticalLoad ??= (async () => {
    mark('data-start');
    const [subjectRows, settingRows] = await Promise.all([db.subjects.toArray(), db.settings.toArray()]);
    const settings: Record<string, string> = Object.fromEntries(settingRows.map(r => [r.key, r.value]));
    migrateLegacyLocalStorage(settings);
    // Ordem de criação; matérias antigas (sem createdAt) mantêm a ordem do banco.
    criticalResult = { subjects: [...subjectRows].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)), settings };
    mark('data-loaded');
    return criticalResult;
  })();
  return criticalLoad;
}

/**
 * Espera (no máximo `maxWaitMs`) a leitura das matérias e configurações. O index.tsx só monta o React depois disto:
 * assim o primeiro quadro já sai com o Ciclo pronto. Se o banco demorar ou falhar, o app abre mesmo assim,
 * pelo caminho normal (carregando → dados).
 */
export function whenFirstDataReady(maxWaitMs: number): Promise<void> {
  return Promise.race([
    loadCritical().then(() => undefined, () => undefined),
    new Promise<void>(resolve => setTimeout(resolve, maxWaitMs)),
  ]);
}

/** Todos os registros de bloco: podem ser milhares e a primeira tela não precisa deles, então vêm depois. */
function loadLogs(): Promise<BlockLog[]> {
  logsLoad ??= db.blockLogs.orderBy('timestamp').reverse().toArray();
  return logsLoad;
}

// Começa a ler o banco já ao carregar este módulo, em paralelo com o resto da inicialização do app
// (montagem do React, desenho do Ciclo), em vez de esperar o primeiro efeito. Erros são tratados no Provider.
void loadCritical().catch(() => undefined);

/** Resolve logo depois de o navegador pintar o quadro atual (ou em 300 ms, se ele nunca pintar, como em segundo plano). */
const afterNextPaint = () => new Promise<void>(resolve => {
  const timer = setTimeout(resolve, 300);
  requestAnimationFrame(() => setTimeout(() => { clearTimeout(timer); resolve(); }, 0));
});

/**
 * Fonte única de dados do app. Toda tela lê e grava por aqui — não há hooks de dados
 * duplicados, então Ciclo, Sprint e Progresso sempre veem o mesmo estado.
 *
 * Padrão: atualiza o estado na hora (otimista) e persiste no Dexie em seguida.
 * Os `useRef` espelham o estado mais recente para que callbacks de timers (que
 * capturam closures antigas) nunca operem sobre dados defasados.
 */
export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Se a leitura inicial já terminou (ver whenFirstDataReady), nasce com os dados e sem tela de "carregando".
  const seeded = useRef(criticalResult).current;
  const [loading, setLoading] = useState(seeded === null);
  const [subjects, setSubjectsState] = useState<Subject[]>(seeded?.subjects ?? []);
  const [blockLogs, setBlockLogsState] = useState<BlockLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [simulados, setSimuladosState] = useState<SimuladoRecord[]>([]);
  const [redacoes, setRedacoesState] = useState<RedacaoSession[]>([]);
  const [settings, setSettingsState] = useState<Record<string, string>>(seeded?.settings ?? {});
  // Tema inicial = o que o script do index.html já aplicou (evita flash até o banco carregar).
  const initialTheme = useRef<Theme>(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  const userName = settings.user_name ?? '';
  const theme: Theme = settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : initialTheme.current;

  const subjectsRef = useRef<Subject[]>(seeded?.subjects ?? []);
  const blockLogsRef = useRef<BlockLog[]>([]);
  const simuladosRef = useRef<SimuladoRecord[]>([]);
  const redacoesRef = useRef<RedacaoSession[]>([]);

  const commitSubjects = useCallback((next: Subject[]) => {
    subjectsRef.current = next;
    setSubjectsState(next);
  }, []);

  const commitBlockLogs = useCallback((next: BlockLog[]) => {
    blockLogsRef.current = next;
    setBlockLogsState(next);
  }, []);

  const commitSimulados = useCallback((next: SimuladoRecord[]) => {
    simuladosRef.current = next;
    setSimuladosState(next);
  }, []);

  const commitRedacoes = useCallback((next: RedacaoSession[]) => {
    redacoesRef.current = next;
    setRedacoesState(next);
  }, []);

  // ── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadCritical();
        if (cancelled) return;
        if (!seeded) { // senão o estado já nasceu com estes dados: reaplicá-los só causaria outra renderização
          commitSubjects(data.subjects);
          setSettingsState(data.settings);
        }
        // Reaplica o espelho do tema (some após reinstalar/restaurar backup) para o próximo boot não piscar.
        if (data.settings.theme === 'light' || data.settings.theme === 'dark') mirrorTheme(data.settings.theme);
      } catch (e) {
        logError('carregar dados', e);
      } finally {
        if (!cancelled && !seeded) setLoading(false); // libera a tela de abertura: o Ciclo já pode ser desenhado
      }

      // Só depois da primeira pintura: os registros de bloco (ofensiva, calendário, acerto).
      try {
        await afterNextPaint();
        const rows = await loadLogs();
        if (cancelled) return;
        // Um registro gravado enquanto a leitura rodava já está em memória: mantém-no junto com os lidos.
        const loadedIds = new Set(rows.map(r => r.id));
        commitBlockLogs([...blockLogsRef.current.filter(l => !loadedIds.has(l.id)), ...rows]);
        mark('logs-loaded');
      } catch (e) {
        logError('carregar registros de bloco', e);
      } finally {
        if (!cancelled) setLogsLoaded(true);
      }

      // Os simulados (dezenas de linhas) vêm por último: nenhuma tela inicial precisa deles.
      try {
        const rows = await db.simuladoRecords.orderBy('completedAt').reverse().toArray();
        if (cancelled) return;
        // Banco sem simulados (o comum): não há o que mostrar, e uma nova renderização do app inteiro custaria à toa.
        if (rows.length === 0 && simuladosRef.current.length === 0) return;
        const loadedIds = new Set(rows.map(r => r.id));
        commitSimulados([...simuladosRef.current.filter(r => !loadedIds.has(r.id)), ...rows]
          .sort((a, b) => b.completedAt - a.completedAt));
      } catch (e) {
        logError('carregar simulados', e);
      }

      try {
        // startedAt não é indexado (os índices são id, completedAt e themeId): ordena em memória.
        const rows = await db.redacaoSessions.toArray();
        if (cancelled) return;
        if (rows.length === 0 && redacoesRef.current.length === 0) return; // idem: sem redações, nada a renderizar de novo
        const loadedIds = new Set(rows.map(r => r.id));
        commitRedacoes([...redacoesRef.current.filter(r => !loadedIds.has(r.id)), ...rows].sort(byStartedAtDesc));
      } catch (e) {
        logError('carregar redações', e);
      }
    })();
    return () => { cancelled = true; };
  }, [commitSubjects, commitBlockLogs, commitSimulados, commitRedacoes, seeded]);

  // ── Tema ────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_BACKGROUND[theme]);
    void syncSystemBars(theme);
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

  // ── Simulados ───────────────────────────────────────────────────────────
  const saveSimulado = useCallback((record: SimuladoRecord) => {
    commitSimulados([record, ...simuladosRef.current.filter(r => r.id !== record.id)]
      .sort((a, b) => b.completedAt - a.completedAt));
    db.simuladoRecords.put(record).catch(e => logError('salvar simulado', e));
  }, [commitSimulados]);

  const deleteSimulado = useCallback((id: string) => {
    commitSimulados(simuladosRef.current.filter(r => r.id !== id));
    db.simuladoRecords.delete(id).catch(e => logError('excluir simulado', e));
  }, [commitSimulados]);

  // ── Redações ────────────────────────────────────────────────────────────
  const saveRedacao = useCallback((session: RedacaoSession) => {
    commitRedacoes([session, ...redacoesRef.current.filter(r => r.id !== session.id)].sort(byStartedAtDesc));
    db.redacaoSessions.put(session).catch(e => logError('salvar redação', e));
  }, [commitRedacoes]);

  const deleteRedacao = useCallback((id: string) => {
    commitRedacoes(redacoesRef.current.filter(r => r.id !== id));
    db.redacaoSessions.delete(id).catch(e => logError('excluir redação', e));
  }, [commitRedacoes]);

  // ── Configurações ───────────────────────────────────────────────────────
  const setSetting = useCallback((key: string, value: string) => {
    setSettingsState(prev => ({ ...prev, [key]: value }));
    db.settings.put({ key, value }).catch(e => logError(`salvar configuração "${key}"`, e));
  }, []);

  const removeSetting = useCallback((key: string) => {
    setSettingsState(prev => {
      if (!(key in prev)) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    db.settings.delete(key).catch(e => logError(`remover configuração "${key}"`, e));
  }, []);

  const setUserName = useCallback((name: string) => setSetting('user_name', name), [setSetting]);

  const setTheme = useCallback((next: Theme) => {
    mirrorTheme(next);
    setSetting('theme', next);
  }, [setSetting]);

  const value = useMemo<AppData>(() => ({
    loading, subjects, blockLogs, logsLoaded, simulados, redacoes, userName, theme, settings,
    addSubject, updateSubject, deleteSubject, resetSubjectBlocks,
    completeBlock, saveBlockLog, saveSimulado, deleteSimulado, saveRedacao, deleteRedacao,
    setUserName, setTheme, setSetting, removeSetting,
  }), [
    loading, subjects, blockLogs, logsLoaded, simulados, redacoes, userName, theme, settings,
    addSubject, updateSubject, deleteSubject, resetSubjectBlocks,
    completeBlock, saveBlockLog, saveSimulado, deleteSimulado, saveRedacao, deleteRedacao,
    setUserName, setTheme, setSetting, removeSetting,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};
