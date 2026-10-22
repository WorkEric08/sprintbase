import React, { Suspense, useState } from 'react';
import { SprintItem, Subject } from '../types';
import { useAppData } from '../contexts/AppDataContext';
import { useStreak } from '../hooks/useStreak';
import StreakWidget from './StreakWidget';
import SubjectCard from './SubjectCard';
import { OverlayFallback, SprintBuilderView, SprintRunnerView, SubjectFormView } from './screens';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Aba principal: matérias, progresso por matéria e entrada para o Montar Sprint. */
const CicloView: React.FC = () => {
  const { subjects, userName, addSubject, updateSubject, deleteSubject, resetSubjectBlocks } = useAppData();
  const { streak, enabled: streakEnabled, ready: streakReady } = useStreak();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [confirmReset, setConfirmReset] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);
  const [building, setBuilding] = useState(false);
  const [sprint, setSprint] = useState<SprintItem[] | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{getGreeting()}</p>
          <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight truncate">
            {userName || 'Estudante'}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {streakEnabled && streakReady && <StreakWidget state={streak} compact />}
          <button
            onClick={() => setAdding(true)}
            aria-label="Nova matéria"
            className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors active:scale-90 shrink-0"
          >
            <Icon name="plus" />
          </button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm md:max-w-lg md:mx-auto">
          <div className="bg-indigo-50 dark:bg-indigo-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="book-open" className="text-indigo-400 text-3xl" />
          </div>
          <h3 className="text-gray-700 dark:text-gray-200 font-medium text-xl">Nenhuma matéria ainda</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Adicione suas matérias e comece a construir seu mapa de blocos de estudo.
          </p>
          <button
            onClick={() => setAdding(true)}
            className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold active:scale-95 transition-transform hover:bg-indigo-700"
          >
            Adicionar matéria
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {subjects.map(subject => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onReset={() => setConfirmReset(subject)}
                onEdit={() => setEditing(subject)}
                onDelete={() => setConfirmDelete(subject)}
              />
            ))}
          </div>

          <button
            onClick={() => setBuilding(true)}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Icon name="list-ul" />
            Montar sprint
          </button>
        </>
      )}

      {adding && (
        <Suspense fallback={<OverlayFallback />}>
          <SubjectFormView
            onSave={data => { addSubject(data); setAdding(false); }}
            onClose={() => setAdding(false)}
          />
        </Suspense>
      )}

      {editing && (
        <Suspense fallback={<OverlayFallback />}>
          <SubjectFormView
            subject={editing}
            onSave={data => { updateSubject(editing.id, data); setEditing(null); }}
            onClose={() => setEditing(null)}
          />
        </Suspense>
      )}

      {confirmReset && (
        <ConfirmDialog
          tone="warning"
          icon="rotate-left"
          title="Resetar blocos?"
          confirmLabel="Sim, resetar blocos"
          onConfirm={() => { resetSubjectBlocks(confirmReset.id); setConfirmReset(null); }}
          onCancel={() => setConfirmReset(null)}
        >
          Todos os blocos concluídos de <span className="font-bold" style={{ color: confirmReset.color }}>{confirmReset.title}</span> serão
          apagados. Esta ação não pode ser desfeita.
        </ConfirmDialog>
      )}

      {confirmDelete && (
        <ConfirmDialog
          icon="trash"
          title="Excluir matéria?"
          confirmLabel="Sim, excluir matéria"
          onConfirm={() => { deleteSubject(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        >
          <span className="font-bold" style={{ color: confirmDelete.color }}>{confirmDelete.title}</span> e todos os seus blocos
          serão excluídos permanentemente.
        </ConfirmDialog>
      )}

      {building && (
        <Suspense fallback={<OverlayFallback />}>
          <SprintBuilderView
            subjects={subjects}
            onStart={items => { setBuilding(false); setSprint(items); }}
            onClose={() => setBuilding(false)}
          />
        </Suspense>
      )}

      {sprint && (
        <Suspense fallback={<OverlayFallback />}>
          <SprintRunnerView items={sprint} onClose={() => setSprint(null)} />
        </Suspense>
      )}
    </div>
  );
};

export default CicloView;
