import { Edital } from '../types';

/**
 * Editais oferecidos na tela: o ENEM (Matriz de Referência oficial do INEP, estável desde 2009) e o "Personalizado",
 * que a pessoa monta (utils/edital.ts). O app original ainda trazia aqui PRF, PF, INSS e tribunais, mas a interface
 * nunca os ofereceu, e os dados deles eram marcados como incompletos (pesos de exemplo e incidências zeradas, a
 * preencher à mão a partir dos editais oficiais). Ficam de fora até alguém conferir cada edital na fonte.
 */

export const ENEM_ID = 'enem';
export const CUSTOM_ID = 'custom';

export const ENEM: Edital = {
  id: ENEM_ID,
  name: 'ENEM',
  organizer: 'INEP',
  category: 'enem',
  typicalMonth: 'Novembro',
  disclaimer: 'Baseado na Matriz de Referência oficial do INEP. Verifique a edição atual em enem.inep.gov.br.',
  subjects: [
    { name: 'Linguagens e Códigos', weight: 22, color: '#8b5cf6', subtopics: [] },
    { name: 'Língua Estrangeira', weight: 3, color: '#a78bfa', subtopics: [] },
    { name: 'Ciências Humanas', weight: 22, color: '#f59e0b', subtopics: [] },
    { name: 'Ciências da Natureza', weight: 22, color: '#10b981', subtopics: [] },
    { name: 'Matemática', weight: 22, color: '#3b82f6', subtopics: [] },
    { name: 'Redação', weight: 9, color: '#ef4444', subtopics: [] },
  ],
};

export const EDITAIS: Edital[] = [ENEM];
