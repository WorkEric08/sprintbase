import React, { useState } from 'react';
import { ChartPoint } from '../utils/chart';

interface Props {
  /** Do mais antigo ao mais recente; pelo menos 2 pontos. */
  points: ChartPoint[];
  /** Valor do topo do eixo (100 para %, 1000 para a nota da redação). */
  max?: number;
  /** Texto depois do valor ("%" ou ""). */
  unit?: string;
  color?: string;
  /** Nome para leitores de tela. */
  label?: string;
}

// Gráfico de linha em SVG próprio (o Recharts custaria ~100 KB para desenhar uma linha). O desenho tem proporção fixa e
// escala com a largura; os textos foram dimensionados para continuar legíveis a 320 px.
const W = 320;
const H = 170;
const PAD = { left: 34, right: 14, top: 12, bottom: 24 };
const GRID = [0, 0.25, 0.5, 0.75, 1];

const formatDay = (ts: number) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/**
 * Evolução ao longo do tempo. Toque num ponto para ver a data e o valor (o último vem selecionado).
 * Estado nunca só por cor: cada ponto tem rótulo de texto acessível.
 */
const EvolutionChart: React.FC<Props> = ({
  points, max = 100, unit = '%', color = '#6366f1', label = 'Evolução do aproveitamento nos simulados',
}) => {
  const [picked, setPicked] = useState<string | null>(null);
  const selected = points.find(p => p.id === picked) ?? points[points.length - 1];

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH * (1 - Math.min(max, Math.max(0, v)) / max);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  return (
    <div>
      <p className="text-sm font-black text-gray-800 dark:text-gray-100 mb-1" aria-live="polite">
        {formatDay(selected.at)} · <span style={{ color }}>{selected.value}{unit}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="group" aria-label={label}>
        {GRID.map(g => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g * max)} y2={y(g * max)} strokeWidth="1" className="stroke-gray-100 dark:stroke-gray-800" />
            <text x={PAD.left - 6} y={y(g * max) + 3} textAnchor="end" fontSize="10" className="fill-gray-400 dark:fill-gray-500">{g * max}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const isSel = p.id === selected.id;
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={`${formatDay(p.at)}: ${p.value}${unit}`}
              aria-pressed={isSel}
              className="cursor-pointer outline-none"
              onClick={() => setPicked(p.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked(p.id); } }}
            >
              {/* área de toque maior que o ponto */}
              <circle cx={x(i)} cy={y(p.value)} r="16" fill="transparent" />
              <circle cx={x(i)} cy={y(p.value)} r={isSel ? 6 : 4} fill={color} className={isSel ? 'stroke-white dark:stroke-gray-900' : ''} strokeWidth={isSel ? 2 : 0} />
            </g>
          );
        })}
        <text x={x(0)} y={H - 6} textAnchor="start" fontSize="10" className="fill-gray-400 dark:fill-gray-500">{formatDay(points[0].at)}</text>
        <text x={x(points.length - 1)} y={H - 6} textAnchor="end" fontSize="10" className="fill-gray-400 dark:fill-gray-500">
          {formatDay(points[points.length - 1].at)}
        </text>
      </svg>
    </div>
  );
};

export default EvolutionChart;
