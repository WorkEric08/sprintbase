import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  message: string;
  onUndo: () => void;
  /** Passou o tempo (ou o aviso foi dispensado): a ação vira definitiva. */
  onExpire: () => void;
  /** Sobe o aviso acima da barra de abas (telas que a mostram). */
  aboveNav?: boolean;
  /** Milissegundos até sumir sozinho. */
  duration?: number;
}

/** "Excluído · Desfazer": a faixa que acompanha toda exclusão, para dar um caminho de volta. */
const UndoBar: React.FC<Props> = ({ message, onUndo, onExpire, aboveNav = false, duration = 7000 }) => {
  useEffect(() => {
    const id = setTimeout(onExpire, duration);
    return () => clearTimeout(id);
  }, [onExpire, duration]);

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 z-[65] flex justify-center pointer-events-none animate-slide-up ${
        aboveNav
          ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-6'
          : 'bottom-[max(env(safe-area-inset-bottom,0px),1rem)]'
      }`}
    >
      <div className="pointer-events-auto flex items-center gap-4 pl-5 pr-2 py-2 rounded-2xl bg-gray-900 dark:bg-gray-800 text-white shadow-2xl max-w-md w-full">
        <span className="flex-1 text-sm font-bold">{message}</span>
        <button
          onClick={onUndo}
          className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-indigo-300 active:scale-95 transition-transform"
        >
          Desfazer
        </button>
      </div>
    </div>,
    document.body
  );
};

export default UndoBar;
