import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Guarda de navegação entre abas: enquanto uma sessão que não deve ser abandonada sem querer está ativa (o simulado),
 * trocar de aba pede confirmação. O botão voltar do aparelho NÃO passa por aqui: cada tela trata o seu (useBackButton).
 */

export interface GuardConfig {
  title: string;
  /** Por que a troca pede confirmação. */
  message: string;
  /** Texto do botão que sai (padrão: "Sair mesmo assim"). */
  confirmLabel?: string;
  /** Texto do botão que fica (padrão: "Continuar"). */
  cancelLabel?: string;
}

interface ContextValue {
  /** Registra (ou troca) o guarda ativo; null o remove. */
  setGuard: (config: GuardConfig | null) => void;
  /** Roda a ação; se houver guarda ativo, pergunta antes. */
  requestNavigation: (action: () => void) => void;
}

const NavigationGuardContext = createContext<ContextValue | null>(null);

export const useNavigationGuard = (): ContextValue => {
  const ctx = useContext(NavigationGuardContext);
  if (!ctx) throw new Error('useNavigationGuard deve ser usado dentro de <NavigationGuardProvider>');
  return ctx;
};

/** Registra um guarda enquanto `active` for true; sai sozinho ao desmontar ou quando `active` vira false. */
export const useRegisterNavigationGuard = (active: boolean, config: GuardConfig) => {
  const { setGuard } = useNavigationGuard();
  const configRef = useRef(config);
  configRef.current = config; // o texto mais recente, sem refazer o efeito a cada renderização

  useEffect(() => {
    if (!active) return;
    setGuard(configRef.current);
    return () => setGuard(null);
  }, [active, setGuard]);
};

export const NavigationGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guard, setGuardState] = useState<GuardConfig | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const setGuard = useCallback((config: GuardConfig | null) => setGuardState(config), []);

  const requestNavigation = useCallback((action: () => void) => {
    // O `() =>` extra impede o React de chamar a ação como se fosse uma função de atualização de estado.
    if (guard) setPending(() => action);
    else action();
  }, [guard]);

  const confirm = () => {
    const action = pending;
    setPending(null);
    action?.();
  };

  const value = useMemo(() => ({ setGuard, requestNavigation }), [setGuard, requestNavigation]);

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      {pending && guard && (
        <ConfirmDialog
          tone="warning"
          icon="stopwatch"
          title={guard.title}
          confirmLabel={guard.confirmLabel ?? 'Sair mesmo assim'}
          cancelLabel={guard.cancelLabel ?? 'Continuar'}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        >
          {guard.message}
        </ConfirmDialog>
      )}
    </NavigationGuardContext.Provider>
  );
};
