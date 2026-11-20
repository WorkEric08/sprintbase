import React, { useMemo, useState } from 'react';
import { RedacaoTheme, RedacaoThemeAxis } from '../types';
import { AXIS_COLORS, AXIS_LABELS, REDACAO_THEMES } from '../data/redacaoThemes';
import Icon from './Icon';

interface Props {
  completedIds: ReadonlySet<string>;
  /** A pessoa tocou num tema: segue para a escolha do modo. */
  onPick: (theme: RedacaoTheme) => void;
  /** Pede para resetar a lista de "Feitas" (quem chama confirma e dá o desfazer). */
  onResetCompleted: () => void;
}

type Filter = 'all' | RedacaoThemeAxis | 'feitas';

const CHIP = 'shrink-0 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95';

/** Lista de temas: busca, filtro por eixo e a categoria "Feitas". Tocar num tema abre a escolha do modo. */
const RedacaoSetupModal: React.FC<Props> = ({ completedIds, onPick, onResetCompleted }) => {
  const [axis, setAxis] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  // Os temas já feitos saem dos filtros normais (e ficam em "Feitas").
  const axes = useMemo(() => {
    const counts = new Map<RedacaoThemeAxis, number>();
    for (const t of REDACAO_THEMES) {
      if (!completedIds.has(t.id)) counts.set(t.axis, (counts.get(t.axis) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => AXIS_LABELS[a[0]].localeCompare(AXIS_LABELS[b[0]]))
      .map(([key, count]) => ({ key, count }));
  }, [completedIds]);

  const doneCount = REDACAO_THEMES.filter(t => completedIds.has(t.id)).length;
  const available = REDACAO_THEMES.length - doneCount;
  const feitas = axis === 'feitas';

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REDACAO_THEMES.filter(t => {
      if (feitas ? !completedIds.has(t.id) : completedIds.has(t.id)) return false;
      if (!feitas && axis !== 'all' && t.axis !== axis) return false;
      return !q || t.title.toLowerCase().includes(q);
    });
  }, [axis, feitas, search, completedIds]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Icon name="magnifying-glass" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs dark:text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tema…"
          aria-label="Buscar tema"
          enterKeyHint="search"
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-violet-300 dark:focus:border-violet-700"
        />
      </div>

      <div className="chips-scroll flex gap-2 pb-1 -mx-4 px-4 md:mx-0 md:px-0" role="group" aria-label="Filtrar por eixo">
        <button
          onClick={() => setAxis('all')}
          aria-pressed={axis === 'all'}
          className={`${CHIP} ${axis === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
          Todos · {available}
        </button>
        {axes.map(({ key, count }) => (
          <button
            key={key}
            onClick={() => setAxis(key)}
            aria-pressed={axis === key}
            className={`${CHIP} ${axis === key ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
            style={axis === key ? { backgroundColor: AXIS_COLORS[key] } : undefined}
          >
            {AXIS_LABELS[key]} · {count}
          </button>
        ))}
        {doneCount > 0 && (
          <button
            onClick={() => setAxis('feitas')}
            aria-pressed={feitas}
            className={`${CHIP} inline-flex items-center gap-1.5 ${
              feitas ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <Icon name="circle-check" className="text-[9px]" />
            Feitas · {doneCount}
          </button>
        )}
      </div>

      {feitas && doneCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
          <Icon name="circle-info" className="text-emerald-700 text-sm mt-0.5 shrink-0 dark:text-emerald-400" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300 flex-1 leading-snug">
            Estas redações já foram feitas. Toque em uma para refazer ou{' '}
            <button onClick={onResetCompleted} className="font-black underline decoration-dotted underline-offset-2">
              resetar todas
            </button>
            . Resetar não apaga nenhuma redação do histórico.
          </p>
        </div>
      )}

      <div className="space-y-2" data-testid="redacao-themes">
        {list.length === 0 && (
          <p className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
            {feitas ? 'Nenhuma redação marcada como feita.' : 'Nenhum tema encontrado.'}
          </p>
        )}
        {list.map(theme => (
          <button
            key={theme.id}
            onClick={() => onPick(theme)}
            className="defer-offscreen w-full text-left p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: AXIS_COLORS[theme.axis] + '20', color: AXIS_COLORS[theme.axis] }}
                  >
                    {AXIS_LABELS[theme.axis]}
                  </span>
                  {theme.year && <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">ENEM {theme.year}</span>}
                  {!theme.verified && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                      A conferir
                    </span>
                  )}
                  {feitas && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                      <Icon name="circle-check" className="text-[9px]" /> Feita
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold leading-snug text-gray-800 dark:text-gray-200">{theme.title}</p>
              </div>
              <Icon name="pen" className="text-violet-600 text-xs mt-1 shrink-0 dark:text-violet-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RedacaoSetupModal;
