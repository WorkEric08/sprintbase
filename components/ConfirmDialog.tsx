import React from 'react';
import { createPortal } from 'react-dom';
import { useBackButton } from '../hooks/useBackButton';
import Icon, { IconName } from './Icon';

type Tone = 'danger' | 'warning';

interface Props {
  tone?: Tone;
  icon: IconName;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONES: Record<Tone, { iconWrap: string; iconText: string; button: string }> = {
  danger: {
    iconWrap: 'bg-red-50 dark:bg-red-900/20',
    iconText: 'text-red-500',
    button: 'bg-red-500 hover:bg-red-600',
  },
  warning: {
    iconWrap: 'bg-amber-50 dark:bg-amber-900/20',
    iconText: 'text-amber-500',
    button: 'bg-amber-500 hover:bg-amber-600',
  },
};

/** Diálogo de confirmação centralizado. O botão voltar do aparelho equivale a "cancelar". */
const ConfirmDialog: React.FC<Props> = ({
  tone = 'danger', icon, title, children, confirmLabel, cancelLabel = 'Cancelar', onConfirm, onCancel,
}) => {
  useBackButton(onCancel);
  const t = TONES[tone];

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-white/80 dark:bg-gray-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 text-center space-y-6 animate-pop-in">
        <div className={`w-16 h-16 ${t.iconWrap} rounded-full flex items-center justify-center mx-auto`}>
          <Icon name={icon} className={`text-2xl ${t.iconText}`} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{children}</p>
        </div>
        <div className="space-y-3 pt-2">
          <button
            onClick={onConfirm}
            className={`w-full py-4 ${t.button} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors active:scale-[0.98]`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
