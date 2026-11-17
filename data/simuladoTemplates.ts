import { SimuladoTemplate } from '../types';

/**
 * Modelos de simulado oferecidos na tela. O app original ainda tinha PRF/PF e INSS aqui, mas a interface nunca os
 * mostrou (e eles não tinham número de questões); ficam de fora até alguém precisar deles.
 */
export const SIMULADO_TEMPLATES: SimuladoTemplate[] = [
  {
    id: 'enem-dia1',
    name: 'ENEM — Dia 1',
    durationMinutes: 330, // 5h30
    strictMode: true,
    hasRedacao: true,
    areas: [
      { name: 'Linguagens e Códigos', color: '#8b5cf6', questionCount: 40 },
      { name: 'Língua Estrangeira', color: '#a78bfa', questionCount: 5 },
      { name: 'Ciências Humanas', color: '#f59e0b', questionCount: 45 },
      { name: 'Redação', color: '#ef4444', questionCount: 1 },
    ],
  },
  {
    id: 'enem-dia2',
    name: 'ENEM — Dia 2',
    durationMinutes: 300, // 5h
    strictMode: true,
    hasRedacao: false,
    areas: [
      { name: 'Ciências da Natureza', color: '#10b981', questionCount: 45 },
      { name: 'Matemática', color: '#3b82f6', questionCount: 45 },
    ],
  },
  {
    id: 'custom',
    name: 'Customizado',
    durationMinutes: 180, // padrão: 3h (ajustável na tela)
    strictMode: false,
    hasRedacao: false,
    areas: [],
  },
];

/** Durações oferecidas no "Customizado", em minutos. */
export const CUSTOM_DURATIONS = [60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 480];
