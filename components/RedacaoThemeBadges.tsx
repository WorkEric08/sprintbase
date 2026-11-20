import React from 'react';
import { RedacaoTheme } from '../types';
import { AXIS_COLORS, AXIS_LABELS } from '../data/redacaoThemes';

/**
 * Etiquetas do tema: o eixo, o ano do ENEM e, enquanto o título ainda não foi conferido na fonte oficial (INEP),
 * o aviso "a conferir". Os temas do ENEM do banco vieram sem conferência (`verified: false`) e a curadoria é manual:
 * mostrar o aviso evita que se treine um título que pode estar errado sem saber disso.
 */
const RedacaoThemeBadges: React.FC<{ theme: RedacaoTheme; extra?: React.ReactNode }> = ({ theme, extra }) => {
  const color = AXIS_COLORS[theme.axis];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
        style={{ backgroundColor: color + '20', color }}
      >
        {AXIS_LABELS[theme.axis]}
      </span>
      {theme.year && (
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">ENEM {theme.year}</span>
      )}
      {!theme.verified && (
        <span
          title="O título e o ano deste tema ainda não foram conferidos na fonte oficial (INEP)."
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
        >
          A conferir
        </span>
      )}
      {extra}
    </div>
  );
};

export default RedacaoThemeBadges;
