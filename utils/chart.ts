/** Ponto de um gráfico de evolução (components/EvolutionChart.tsx): quando e quanto. */
export interface ChartPoint {
  id: string;
  /** Instante (ms) do registro. */
  at: number;
  value: number;
}
