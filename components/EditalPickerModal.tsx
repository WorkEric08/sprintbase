import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppData } from '../contexts/AppDataContext';
import { CUSTOM_ID, ENEM, ENEM_ID } from '../data/editais';
import { useBackButton } from '../hooks/useBackButton';
import { CUSTOM_NAME_MAX, CustomSubject, customToEdital, matchSubject, parseCustomEdital, planApply, serializeCustomEdital } from '../utils/edital';
import { SETTING_KEYS } from '../utils/settings';
import Icon from './Icon';

interface Props {
  onClose: () => void;
}

type Step = 'pick' | 'confirm-enem' | 'custom';

const PALETTE = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'];
const LABEL = 'text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest';
const FIELD = 'w-full bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-700';

/**
 * Escolha do edital: ENEM (matérias da Matriz de Referência) ou Personalizado (matérias que você nomeia).
 * Aplicar cria as matérias que faltam e LIGA as que já existem ao edital (`editalKey`), para a cobertura continuar
 * certa mesmo se você renomear uma matéria depois. Nada é apagado.
 */
const EditalPickerModal: React.FC<Props> = ({ onClose }) => {
  const { subjects, settings, setSetting, removeSetting, applyEdital } = useAppData();
  const activeId = settings[SETTING_KEYS.selectedEdital];
  const [step, setStep] = useState<Step>('pick');

  const saved = parseCustomEdital(settings[SETTING_KEYS.customEdital]);
  const [name, setName] = useState(saved?.name ?? '');
  const [list, setList] = useState<CustomSubject[]>(saved?.subjects ?? []);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const back = () => (step === 'pick' ? onClose() : setStep('pick'));
  useBackButton(back);

  const enemPlan = planApply(ENEM, subjects);

  const applyEnem = (createSubjects: boolean) => {
    setSetting(SETTING_KEYS.selectedEdital, ENEM_ID);
    if (createSubjects) applyEdital(enemPlan);
    onClose();
  };

  const addSubject = () => {
    const n = newName.trim();
    if (!n || list.some(s => s.name.toLowerCase() === n.toLowerCase())) return;
    setList(prev => [...prev, { name: n, color: newColor }]);
    setNewName('');
    setNewColor(PALETTE[(list.length + 1) % PALETTE.length]);
  };

  const saveCustom = () => {
    const custom = { name: name.trim(), subjects: list };
    if (!custom.name) return;
    setSetting(SETTING_KEYS.customEdital, serializeCustomEdital(custom));
    setSetting(SETTING_KEYS.selectedEdital, CUSTOM_ID);
    applyEdital(planApply(customToEdital(custom), subjects));
    onClose();
  };

  const title = step === 'pick' ? 'Edital' : step === 'confirm-enem' ? 'Confirmar ENEM' : 'Edital personalizado';
  const duplicate = list.some(s => s.name.toLowerCase() === newName.trim().toLowerCase());

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col justify-end md:justify-center md:items-center md:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div role="dialog" aria-label={title} className="relative w-full md:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto modal-scroll animate-slide-up">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pt-3 pb-3 px-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 md:hidden" />
          <div className="flex items-center gap-3">
            <button onClick={back} aria-label="Voltar" className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 active:scale-90 transition-transform shrink-0 dark:text-gray-400">
              <Icon name="arrow-left" className="text-sm" />
            </button>
            <h2 className="text-base font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{title}</h2>
          </div>
        </div>

        {step === 'pick' && (
          <div className="p-5 space-y-3 pb-8">
            {([
              { id: ENEM_ID, kicker: 'INEP/MEC', title: 'ENEM', text: `${ENEM.subjects.length} matérias · Matriz de Referência oficial`, go: 'confirm-enem' as const, icon: 'book-open' as const },
              { id: CUSTOM_ID, kicker: 'Personalizado', title: saved?.name ?? 'Seu edital', text: saved ? `${saved.subjects.length} ${saved.subjects.length === 1 ? 'matéria' : 'matérias'}` : 'Crie um edital com as matérias que você escolher', go: 'custom' as const, icon: 'sliders' as const },
            ]).map(o => (
              <button
                key={o.id}
                onClick={() => setStep(o.go)}
                className={`w-full text-left bg-gray-50 dark:bg-gray-800/40 rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${
                  activeId === o.id ? 'border-indigo-400 dark:border-indigo-600' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{o.kicker}</span>
                      {activeId === o.id && (
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">Ativo</span>
                      )}
                    </div>
                    <p className="font-black text-gray-800 dark:text-gray-100 text-sm uppercase tracking-tight">{o.title}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">{o.text}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                    <Icon name={o.icon} />
                  </div>
                </div>
              </button>
            ))}
            {activeId && (
              <button
                onClick={() => { removeSetting(SETTING_KEYS.selectedEdital); onClose(); }}
                className="w-full py-3 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest"
              >
                Não usar edital (as matérias continuam)
              </button>
            )}
          </div>
        )}

        {step === 'confirm-enem' && (
          <div className="p-5 space-y-4 pb-8">
            <p className="rounded-2xl p-3.5 text-xs leading-relaxed bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300">
              {ENEM.disclaimer}
            </p>

            <div className="space-y-2">
              <p className={LABEL}>
                {enemPlan.add.length > 0 ? `${enemPlan.add.length} ${enemPlan.add.length === 1 ? 'matéria será criada' : 'matérias serão criadas'}` : 'Todas as matérias já existem'}
              </p>
              {ENEM.subjects.map(es => {
                const found = matchSubject(subjects, es.name);
                return (
                  <div key={es.name} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: es.color }} />
                    <span className="flex-1 min-w-0 text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{es.name}</span>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0 text-right">
                      {es.weight}% · {found ? 'já existe' : 'será criada'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => applyEnem(true)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-indigo-500/20"
              >
                <Icon name="check" />
                Aplicar ENEM
              </button>
              <button onClick={() => applyEnem(false)} className="w-full py-3 text-gray-500 dark:text-gray-400 text-[11px] font-black uppercase tracking-widest">
                Selecionar sem criar matérias
              </button>
            </div>
          </div>
        )}

        {step === 'custom' && (
          <div className="p-5 space-y-5 pb-8">
            <div className="space-y-2">
              <label htmlFor="edital-name" className={LABEL}>Nome da prova ou concurso</label>
              <input
                id="edital-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex.: OAB, ANATEL, Minha prova…"
                maxLength={CUSTOM_NAME_MAX}
                enterKeyHint="done"
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className={FIELD}
              />
            </div>

            <div className="space-y-2">
              <p className={LABEL}>Matérias ({list.length})</p>
              {list.map(s => (
                <div key={s.name} data-testid="custom-subject" className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl pl-4 pr-2 py-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 min-w-0 text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{s.name}</span>
                  <button
                    onClick={() => setList(prev => prev.filter(x => x.name !== s.name))}
                    aria-label={`Remover ${s.name}`}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 active:scale-90 transition-transform"
                  >
                    <Icon name="trash" className="text-xs" />
                  </button>
                </div>
              ))}

              <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-3 space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome da matéria"
                  aria-label="Nome da nova matéria"
                  maxLength={40}
                  enterKeyHint="done"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); e.currentTarget.blur(); } }}
                  className={FIELD}
                />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Cor da matéria">
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      aria-label={`Cor ${c}`}
                      aria-pressed={newColor === c}
                      className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${newColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={addSubject}
                  disabled={!newName.trim() || duplicate}
                  className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                >
                  <Icon name="plus" className="text-[10px]" />
                  {duplicate ? 'Matéria já adicionada' : 'Adicionar matéria'}
                </button>
              </div>
            </div>

            <button
              onClick={saveCustom}
              disabled={!name.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:shadow-none"
            >
              <Icon name="check" />
              Salvar e aplicar
            </button>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed text-center">
              As matérias que ainda não existem no Ciclo são criadas (blocos de 50 min, meta de 20); as que já existem só são ligadas ao edital.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default EditalPickerModal;
