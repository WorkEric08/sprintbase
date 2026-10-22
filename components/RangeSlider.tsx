import React from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  id?: string;
  ariaLabel?: string;
  /** Cor da parte preenchida e do botão; o resto da trilha usa um tom bem claro/escuro dela. */
  color?: string;
}

/**
 * Controle deslizante com o visual do app (regras em index.css, `.sprint-range`).
 *
 * O desenho padrão do navegador pinta a trilha restante de quase branco e deixa uma borda clara nas pontas, que
 * destoa do roxo/azul do app. Aqui a trilha é uma só linha da cor do app: preenchida até o botão e, depois dele,
 * a mesma cor bem suave, com as duas pontas arredondadas.
 */
const RangeSlider: React.FC<Props> = ({ value, min, max, step = 1, onChange, id, ariaLabel, color = '#4f46e5' }) => {
  const fraction = max > min ? (value - min) / (max - min) : 0;
  return (
    <input
      id={id}
      type="range"
      className="sprint-range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={e => onChange(Number(e.target.value))}
      style={{ '--p': fraction, '--range-color': color } as React.CSSProperties}
    />
  );
};

export default RangeSlider;
