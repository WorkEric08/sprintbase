import React, { useMemo, useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';
import { Edital } from '../types';
import { computeCoverage } from '../utils/edital';
import Icon from './Icon';

interface Props {
  edital: Edital;
}

const BAR = 'h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden';

/**
 * Quanto do edital já foi estudado: matérias com pelo menos 1 bloco concluído e, quando o edital lista subtópicos,
 * os que aparecem nos seus registros. A matéria do app se liga à do edital pela chave gravada ao aplicar o edital,
 * então renomear uma matéria não quebra a cobertura (utils/edital.ts).
 */
const EditalCoverageCard: React.FC<Props> = ({ edital }) => {
  const { subjects, blockLogs } = useAppData();
  const [expanded, setExpanded] = useState(false);
  const [showUntouched, setShowUntouched] = useState(false);
  const cov = useMemo(() => computeCoverage(edital, subjects, blockLogs), [edital, subjects, blockLogs]);
  const untouched = cov.subjects.filter(s => s.untouchedSubtopics.length > 0);

  return (
    <div data-testid="edital-coverage" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} aria-expanded={expanded} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Edital coberto</p>
            <p className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight mt-0.5">{edital.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{cov.subjectsPct}%</p>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">das matérias</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between mb-1 gap-2">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Matérias ({cov.coveredSubjects}/{cov.subjects.length})</span>
              <span className="text-[10px] font-black text-indigo-500">{cov.subjectsPct}%</span>
            </div>
            <div className={BAR}><div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${cov.subjectsPct}%` }} /></div>
          </div>
          {cov.totalSubtopics > 0 && (
            <div>
              <div className="flex justify-between mb-1 gap-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Subtópicos ({cov.coveredSubtopics}/{cov.totalSubtopics})</span>
                <span className="text-[10px] font-black text-violet-500">{cov.subtopicsPct}%</span>
              </div>
              <div className={BAR}><div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${cov.subtopicsPct}%` }} /></div>
            </div>
          )}
        </div>

        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1.5">
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} className="text-[8px]" />
          {expanded ? 'Recolher' : 'Ver por matéria'}
        </p>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/60">
          {cov.subjects.map(c => (
            <div key={c.editalSubjectName} data-testid="coverage-row" data-covered={c.covered} className="px-4 py-3 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${c.covered ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{c.editalSubjectName}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {c.appSubject
                    ? <>No Ciclo: {c.appSubject.title}{c.subtopicsTotal > 0 && ` · ${c.subtopicsCovered}/${c.subtopicsTotal} subtópicos`}</>
                    : 'Sem matéria no Ciclo'}
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${c.covered ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {c.covered ? <><Icon name="check" className="text-[9px] mr-1" />Coberto</> : 'Não tocado'}
              </span>
            </div>
          ))}

          {untouched.length > 0 && (
            <div className="px-4 py-3">
              <button onClick={() => setShowUntouched(s => !s)} className="py-1 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                <Icon name="circle-exclamation" className="mr-1.5 text-[10px]" />
                {showUntouched ? 'Ocultar' : 'Ver'} subtópicos nunca estudados
              </button>
              {showUntouched && (
                <div className="mt-3 space-y-3">
                  {untouched.map(g => (
                    <div key={g.editalSubjectName}>
                      <p className="flex items-center gap-1.5 mb-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />{g.editalSubjectName}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.untouchedSubtopics.map(st => (
                          <span key={st} className="px-2.5 py-1 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-full text-[10px] font-bold text-red-700 dark:text-red-400">{st}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditalCoverageCard;
