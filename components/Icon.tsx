import React from 'react';
import {
  IconDefinition,
  faArrowLeft, faArrowsRotate, faBolt, faBookOpen, faBullseye, faChartLine, faCheck, faCircleCheck,
  faCircleExclamation, faCircleInfo, faClock, faDownload, faFaceSmile, faFileExport, faFileImport, faFire,
  faFlask, faGear, faHeart, faHourglassHalf, faListUl, faMinus, faMoon, faMugHot, faPalette, faPause, faPen,
  faPencil, faPlay, faPlus, faRotate, faRotateLeft, faSun, faTrash, faTriangleExclamation, faUser, faXmark,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Ícones como SVG embutido (só os que o app usa), no lugar da fonte do Font Awesome.
 *
 * Por quê: a fonte inteira (~155 KB) e o CSS do Font Awesome (~100 KB, com milhares de ícones) precisavam ser
 * lidos e interpretados antes de qualquer ícone aparecer. Com SVG, os ícones já nascem no primeiro desenho.
 * Para usar um ícone novo, importe-o acima e registre-o em ICONS: nomes que não existem não compilam.
 */
const ICONS = {
  'arrow-left': faArrowLeft,
  'arrows-rotate': faArrowsRotate,
  bolt: faBolt,
  'book-open': faBookOpen,
  bullseye: faBullseye,
  'chart-line': faChartLine,
  check: faCheck,
  'circle-check': faCircleCheck,
  'circle-exclamation': faCircleExclamation,
  'circle-info': faCircleInfo,
  clock: faClock,
  download: faDownload,
  'face-smile': faFaceSmile,
  'file-export': faFileExport,
  'file-import': faFileImport,
  fire: faFire,
  flask: faFlask,
  gear: faGear,
  heart: faHeart,
  'hourglass-half': faHourglassHalf,
  'list-ul': faListUl,
  minus: faMinus,
  moon: faMoon,
  'mug-hot': faMugHot,
  palette: faPalette,
  pause: faPause,
  pen: faPen,
  pencil: faPencil,
  play: faPlay,
  plus: faPlus,
  rotate: faRotate,
  'rotate-left': faRotateLeft,
  sun: faSun,
  times: faXmark,
  trash: faTrash,
  'triangle-exclamation': faTriangleExclamation,
  user: faUser,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  /** Tamanho = `text-*` (o ícone mede 1em); cor = `text-*` de cor (usa currentColor). */
  className?: string;
}

const Icon: React.FC<Props> = ({ name, className }) => {
  const [width, height, , , path] = ICONS[name].icon;
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
