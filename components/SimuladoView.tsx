import React, { useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { useSimuladoSession } from '../hooks/useSimuladoSession';
import { SimuladoRecord } from '../types';
import { isDevModeUser } from '../utils/devMode';
import { outcomeOf } from '../utils/simulado';
import PostSimuladoModal from './PostSimuladoModal';
import SimuladoHistoryView from './SimuladoHistoryView';
import SimuladoRunnerView from './SimuladoRunnerView';
import SimuladoSetupModal from './SimuladoSetupModal';

/**
 * Aba Simulado. Três estados, todos derivados do simulado gravado (`useSimuladoSession`):
 *  - nenhum: escolher o modelo e começar;
 *  - em andamento: cronômetro;
 *  - encerrado e sem registro: a tela de escolha com a folha de registro por cima.
 * Como o estado é o gravado, reabrir o app (até depois de o Android matar o processo) cai no mesmo ponto.
 */
const SimuladoView: React.FC = () => {
  const { userName, simulados, saveSimulado, deleteSimulado } = useAppData();
  const sim = useSimuladoSession();
  const [historyOpen, setHistoryOpen] = useState(false);
  const isDevMode = isDevModeUser(userName);
  const { session } = sim;

  const finish = (record: SimuladoRecord) => {
    saveSimulado(record);
    sim.clear();
  };

  return (
    <>
      {session && session.endedAt === null ? (
        <SimuladoRunnerView
          session={session}
          alerts={sim.alerts}
          onAllowExact={sim.allowExact}
          isDevMode={isDevMode}
          onPause={sim.pause}
          onResume={sim.resume}
          onEnd={sim.end}
        />
      ) : (
        <SimuladoSetupModal
          isDevMode={isDevMode}
          recordCount={simulados.length}
          onStart={sim.start}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      )}

      {session && session.endedAt !== null && (
        <PostSimuladoModal
          session={session}
          outcome={outcomeOf(session, isDevMode)}
          onSave={finish}
          onSkip={finish}
        />
      )}

      {historyOpen && (
        <SimuladoHistoryView
          records={simulados}
          onSave={saveSimulado}
          onDelete={deleteSimulado}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </>
  );
};

export default SimuladoView;
