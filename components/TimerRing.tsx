import React from 'react';

interface Props {
  /** 1 → 0 ao longo da contagem. */
  fraction: number;
  color: string;
  children: React.ReactNode;
}

const CIRCUMFERENCE = 2 * Math.PI * 45;

/** Anel de progresso dos cronômetros (bloco de estudo e pausa). */
const TimerRing: React.FC<Props> = ({ fraction, color, children }) => (
  <div className="relative flex items-center justify-center w-72 h-72">
    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle className="text-gray-100 dark:text-gray-900 stroke-current" strokeWidth="4" fill="transparent" r="45" cx="50" cy="50" />
      <circle
        className="transition-all duration-300 ease-linear"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, fraction)))}
        strokeLinecap="round"
        fill="transparent"
        r="45" cx="50" cy="50"
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
  </div>
);

export default TimerRing;
