import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faArrowTrendDown } from '@fortawesome/free-solid-svg-icons/faArrowTrendDown';
import { faArrowTrendUp } from '@fortawesome/free-solid-svg-icons/faArrowTrendUp';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons/faArrowsRotate';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faBellSlash } from '@fortawesome/free-solid-svg-icons/faBellSlash';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faBookmark } from '@fortawesome/free-solid-svg-icons/faBookmark';
import { faBullseye } from '@fortawesome/free-solid-svg-icons/faBullseye';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faCheckDouble } from '@fortawesome/free-solid-svg-icons/faCheckDouble';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons/faClockRotateLeft';
import { faCrosshairs } from '@fortawesome/free-solid-svg-icons/faCrosshairs';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faFileExport } from '@fortawesome/free-solid-svg-icons/faFileExport';
import { faFileImport } from '@fortawesome/free-solid-svg-icons/faFileImport';
import { faFileLines } from '@fortawesome/free-solid-svg-icons/faFileLines';
import { faFlask } from '@fortawesome/free-solid-svg-icons/faFlask';
import { faHourglassHalf } from '@fortawesome/free-solid-svg-icons/faHourglassHalf';
import { faLaptop } from '@fortawesome/free-solid-svg-icons/faLaptop';
import { faListCheck } from '@fortawesome/free-solid-svg-icons/faListCheck';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon';
import { faMugHot } from '@fortawesome/free-solid-svg-icons/faMugHot';
import { faPalette } from '@fortawesome/free-solid-svg-icons/faPalette';
import { faPause } from '@fortawesome/free-solid-svg-icons/faPause';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faSliders } from '@fortawesome/free-solid-svg-icons/faSliders';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faTrophy } from '@fortawesome/free-solid-svg-icons/faTrophy';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { registerIcons } from './Icon';

/**
 * Cada ícone é importado do seu próprio arquivo (e não do índice do pacote): é isso que mantém estes ícones fora do
 * arquivo principal. O índice é um módulo só; se as duas pontas o importassem, o empacotador o deixaria inteiro no
 * arquivo principal.
 *
 * Os ícones que o primeiro quadro NÃO usa. Ficam fora do arquivo principal do app: o aparelho só precisa ler e
 * compilar os 21 do Ciclo e da barra de abas para pintar a tela inicial. Todas as outras telas (carregadas sob demanda,
 * ver components/screens.tsx) carregam este módulo junto, então os ícones já estão registrados quando elas desenham.
 *
 * Um ícone que a tela inicial passe a usar precisa ir para o CORE em Icon.tsx (utils/icons.test.ts confere).
 */
export const EXTRA_ICONS = {
  'arrow-left': faArrowLeft,
  'arrow-trend-down': faArrowTrendDown,
  'arrow-trend-up': faArrowTrendUp,
  'arrows-rotate': faArrowsRotate,
  bell: faBell,
  'bell-slash': faBellSlash,
  bolt: faBolt,
  bookmark: faBookmark,
  bullseye: faBullseye,
  check: faCheck,
  'check-double': faCheckDouble,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  'circle-check': faCircleCheck,
  'circle-exclamation': faCircleExclamation,
  clock: faClock,
  'clock-rotate-left': faClockRotateLeft,
  crosshairs: faCrosshairs,
  download: faDownload,
  'file-export': faFileExport,
  'file-import': faFileImport,
  'file-lines': faFileLines,
  flask: faFlask,
  'hourglass-half': faHourglassHalf,
  laptop: faLaptop,
  'list-check': faListCheck,
  lock: faLock,
  'magnifying-glass': faMagnifyingGlass,
  minus: faMinus,
  moon: faMoon,
  'mug-hot': faMugHot,
  palette: faPalette,
  pause: faPause,
  play: faPlay,
  sliders: faSliders,
  star: faStar,
  sun: faSun,
  times: faXmark,
  trophy: faTrophy,
} satisfies Record<string, IconDefinition>;

registerIcons(EXTRA_ICONS);
