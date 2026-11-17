import React from 'react';
import {
  IconDefinition,
  faBookOpen, faCalendarDays, faChartLine, faChevronDown, faChevronUp, faCircleInfo, faFaceSmile, faFire,
  faFlagCheckered, faGear, faHeart, faListUl, faPen, faPencil, faPlus, faRotate, faRotateLeft, faStopwatch, faTrash,
  faTriangleExclamation, faUser,
} from '@fortawesome/free-solid-svg-icons';
import type { EXTRA_ICONS } from './iconsExtra';

/**
 * Ícones como SVG embutido (só os que o app usa), no lugar da fonte do Font Awesome.
 *
 * Por quê: a fonte inteira (~155 KB) e o CSS do Font Awesome (~100 KB, com milhares de ícones) precisavam ser
 * lidos e interpretados antes de qualquer ícone aparecer. Com SVG, os ícones já nascem no primeiro desenho.
 *
 * Dois grupos. O CORE (aqui) são os ícones que o primeiro quadro usa: Ciclo, barra de abas, ofensiva, contagem da
 * prova e os diálogos de confirmação do Ciclo. Cada ícone a mais no arquivo principal é código que o aparelho lê e
 * compila antes de pintar. Os demais ficam em iconsExtra.ts e chegam junto com as telas que os usam.
 * Para usar um ícone novo: se ele aparece na tela inicial, registre-o abaixo; senão, em iconsExtra.ts.
 * Nomes que não existem não compilam.
 */
const CORE = {
  'book-open': faBookOpen,
  'calendar-days': faCalendarDays,
  'chart-line': faChartLine,
  'chevron-down': faChevronDown,
  'chevron-up': faChevronUp,
  'circle-info': faCircleInfo,
  'face-smile': faFaceSmile,
  fire: faFire,
  'flag-checkered': faFlagCheckered,
  gear: faGear,
  heart: faHeart,
  'list-ul': faListUl,
  pen: faPen,
  pencil: faPencil,
  plus: faPlus,
  rotate: faRotate,
  'rotate-left': faRotateLeft,
  stopwatch: faStopwatch,
  trash: faTrash,
  'triangle-exclamation': faTriangleExclamation,
  user: faUser,
} satisfies Record<string, IconDefinition>;

export const CORE_ICON_NAMES = Object.keys(CORE);

const registry = new Map<string, IconDefinition>(Object.entries(CORE));

/** Registra mais ícones (chamado por iconsExtra.ts ao carregar). */
export function registerIcons(icons: Record<string, IconDefinition>) {
  for (const [name, def] of Object.entries(icons)) registry.set(name, def);
}

export type IconName = keyof typeof CORE | keyof typeof EXTRA_ICONS;

interface Props {
  name: IconName;
  /** Tamanho = `text-*` (o ícone mede 1em); cor = `text-*` de cor (usa currentColor). */
  className?: string;
}

const Icon: React.FC<Props> = ({ name, className }) => {
  const def = registry.get(name);
  if (!def) {
    // Um ícone extra pedido antes de as telas carregarem seus ícones: nunca deveria acontecer (utils/icons.test.ts).
    console.error(`Ícone "${name}" não registrado: ele precisa estar no CORE de Icon.tsx`);
    return null;
  }
  const [width, height, , , path] = def.icon;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      fill="currentColor"
      className={className ? `sprint-icon ${className}` : 'sprint-icon'}
      style={{ '--icon-aspect': width / height } as React.CSSProperties}
    >
      <path d={Array.isArray(path) ? path.join('') : path} />
    </svg>
  );
};

export default Icon;
