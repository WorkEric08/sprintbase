import React, { useRef, useState } from 'react';
import {
  BackupError, BackupFile, BackupSummary, backupFileName, createBackup, parseBackup,
  restoreBackup, serializeBackup, summarizeBackup,
} from '../utils/backup';
import { saveTextFile } from '../utils/files';
import { isNative } from '../utils/platform';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';

const LABEL = 'text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest';
const BTN = 'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 disabled:opacity-50';

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

const formatDate = (d: Date | null) =>
  d ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'data desconhecida';

/** Exportar e importar um backup completo dos dados. Importar substitui o que existe no app. */
const BackupCard: React.FC = () => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState<{ backup: BackupFile; summary: BackupSummary } | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const backup = await createBackup();
      const shared = await saveTextFile(backupFileName(), serializeBackup(backup), 'Salvar backup do Sprint');
      if (shared) {
        const s = summarizeBackup(backup);
        setFeedback({ kind: 'ok', text: `Backup gerado: ${s.subjects} matérias e ${s.blockLogs} registros. Guarde o arquivo em um lugar seguro.` });
      }
    } catch (e) {
      console.error('Falha ao exportar o backup', e);
      setFeedback({ kind: 'error', text: 'Não foi possível gerar o backup.' });
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setFeedback(null);
    try {
      const backup = parseBackup(await file.text());
      setPending({ backup, summary: summarizeBackup(backup) });
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof BackupError ? err.message : 'Não foi possível ler o arquivo.' });
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending.backup);
      // Recarrega para todo o app reler o banco (contexto, tema, nome...).
      window.location.reload();
    } catch (err) {
      setPending(null);
      setBusy(false);
      setFeedback({ kind: 'error', text: err instanceof BackupError ? err.message : 'Não foi possível restaurar o backup.' });
    }
  };

  return (
    <div className="space-y-2">
      <span className={LABEL}>Seus dados</span>
      <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed px-1">
        Tudo fica só neste aparelho. Desinstalar o app ou limpar os dados apaga o histórico, então guarde um backup.
      </p>

      <div className="flex gap-3">
        <button onClick={() => { void handleExport(); }} disabled={busy} className={BTN}>
          <Icon name="file-export" />
          Exportar
        </button>
        <button onClick={() => fileInput.current?.click()} disabled={busy} className={BTN}>
          <Icon name="file-import" />
          Importar
        </button>
      </div>

      {/* No Android o filtro por tipo esconde arquivos de backup que chegam como "octet-stream". */}
      <input
        ref={fileInput}
        type="file"
        accept={isNative ? undefined : '.json,application/json'}
        onChange={e => { void handleFile(e); }}
        className="hidden"
        aria-label="Arquivo de backup"
      />

      {feedback && (
        <p className={`text-xs font-medium px-1 ${feedback.kind === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`} role="status">
          <Icon name={feedback.kind === 'ok' ? 'circle-check' : 'circle-exclamation'} className="mr-1.5" />
          {feedback.text}
        </p>
      )}

      {pending && (
        <ConfirmDialog
          tone="warning"
          icon="file-import"
          title="Substituir seus dados?"
          confirmLabel="Sim, restaurar backup"
          onConfirm={() => { void confirmImport(); }}
          onCancel={() => setPending(null)}
        >
          O backup de <span className="font-bold">{formatDate(pending.summary.exportedAt)}</span> tem{' '}
          <span className="font-bold">{pending.summary.subjects} matérias</span> e{' '}
          <span className="font-bold">{pending.summary.blockLogs} registros</span>. Os dados atuais deste aparelho serão{' '}
          <span className="font-bold text-red-500">substituídos</span>.
        </ConfirmDialog>
      )}
    </div>
  );
};

export default BackupCard;
