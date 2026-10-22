import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SprintItem } from '../types';
import { useAppData } from '../contexts/AppDataContext';
import { isDevModeUser } from '../utils/devMode';
import BlockTimerView from './BlockTimerView';
import BreakTimerView from './BreakTimerView';

interface Props {
  items: SprintItem[];
  onClose: () => void;
}

/**
 * Percorre a fila do sprint item a item. Lê as matérias do contexto (estado ao vivo),
 * então o progresso mostrado no cronômetro e gravado em `completeBlock` é sempre o atual.
 *
 * A tela cheia (fundo opaco) pertence a ESTE componente e dura o sprint inteiro; cada bloco ou pausa
 * é só o conteúdo dela. Se cada etapa fosse a sua própria tela cheia com animação de entrada, ao
 * pular uma etapa a antiga sumiria na hora e a nova nasceria transparente, deixando a tela inicial
 * à mostra por uns 200 ms.
 */
const SprintRunnerView: React.FC<Props> = ({ items, onClose }) => {
  const { subjects, blockLogs, userName, completeBlock, saveBlockLog } = useAppData();
  const [index, setIndex] = useState(0);

  // O botão voltar é tratado por cada tela filha (cronômetro de bloco / pausa). O runner não
  // registra handler próprio: como efeitos de filhos rodam antes dos do pai, ele ficaria
  // no topo da pilha ao montar e fecharia o sprint inteiro sem pedir confirmação.

  const advance = () => {
    if (index + 1 >= items.length) onClose();
    else setIndex(index + 1);
  };

  const current = items[index];
  const subject = current?.type === 'study' ? subjects.find(s => s.id === current.subjectId) : undefined;
  const subjectMissing = current?.type === 'study' && !subject;

  // Matéria removida durante o sprint (não esperado): pula o item em vez de travar numa tela vazia.
  useEffect(() => {
    if (subjectMissing) advance();
  }, [subjectMissing]); // eslint-disable-line react-hooks/exhaustive-deps

  let screen: React.ReactNode = null;
  if (current?.type === 'break') {
    const nextStudy = items.slice(index + 1).find(i => i.type === 'study');
    const nextSubject = nextStudy?.type === 'study'
      ? subjects.find(s => s.id === nextStudy.subjectId) ?? null
      : null;
    screen = (
      <BreakTimerView
        key={current.id}
        duration={current.duration}
        nextSubject={nextSubject}
        breakIndex={items.slice(0, index + 1).filter(i => i.type === 'break').length}
        totalBreaks={items.filter(i => i.type === 'break').length}
        onDone={advance}
      />
    );
  } else if (current && subject) {
    screen = (
      <BlockTimerView
        key={current.id}
        subject={subject}
        blockType={current.blockType}
        cycleIndex={items.slice(0, index + 1).filter(i => i.type === 'study').length - 1}
        cycleTotal={items.filter(i => i.type === 'study').length}
        blockLogs={blockLogs}
        isDevMode={isDevModeUser(userName)}
        onComplete={() => completeBlock(subject.id, current.blockType)}
        onSaveLog={data => saveBlockLog(subject.id, data, current.blockType)}
        onNext={advance}
        onExit={onClose}
      />
    );
  }

  return createPortal(
    <div data-testid="sprint-runner" className="fixed inset-0 z-[60] overflow-hidden bg-gray-50 dark:bg-gray-950">
      {screen}
    </div>,
    document.body
  );
};

export default SprintRunnerView;
