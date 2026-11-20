import React, { useEffect, useRef, useState } from 'react';
import { SimuladoSession } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { useRegisterNavigationGuard } from '../contexts/NavigationGuardContext';
import { AlertsResult } from '../services/simuladoAlerts';
import { isNative } from '../utils/platform';
import { isPaused, milestonesToAnnounce, plannedMs, remainingMs, Milestone } from '../utils/simulado';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';

interface Props {
  session: SimuladoSession;
  alerts: AlertsResult;
  /** Abre a tela "Alarmes e lembretes" do Android (avisos exatos). */
  onAllowExact: () => void;
  isDevMode: boolean;
  onPause: () => void;
  onResume: () => void;
  /** O tempo acabou ou a pessoa confirmou "Encerrar": o registro abre em seguida. */
  onEnd: () => void;
}

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

/** Cor que esquenta conforme o fim se aproxima. */
function urgencyColor(secondsLeft: number): string {
  if (secondsLeft <= 600) return '#ef4444';
  if (secondsLeft <= 1800) return '#f59e0b';
  return '#6366f1';
}

const CIRCUMFERENCE = 2 * Math.PI * 90;
const TOAST_MS = 4000;

/** Horário real que o relógio enxerga, atualizado 4×/s e ao voltar para o app (a tela pode ter ficado horas apagada). */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    if (!running) return;
    const id = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running]);
  return now;
}

/**
 * Cronômetro do simulado (dentro da aba). Só mostra o relógio e os controles: o estado todo (início, pausas, fim)
 * está em `session`, gravado a cada mudança, e o tempo é sempre recalculado do horário real.
 */
const SimuladoRunnerView: React.FC<Props> = ({ session, alerts, onAllowExact, isDevMode, onPause, onResume, onEnd }) => {
  const paused = isPaused(session);
  const now = useNow(!paused);
  const remaining = remainingMs(session, now);
  const secondsLeft = Math.ceil(remaining / 1000);
  const color = urgencyColor(secondsLeft);
  const progress = 1 - remaining / plannedMs(session);

  const [showExit, setShowExit] = useState(false);
  const [toast, setToast] = useState<Milestone | null>(null);
  const firedRef = useRef<ReadonlySet<Milestone['id']>>(new Set());

  useKeepAwake(!paused);

  // Trocar de aba pede confirmação. O simulado NÃO se perde ao sair (continua gravado e correndo), mas na prova a
  // distração custa caro; por isso a pergunta, e ela diz claramente o que acontece.
  useRegisterNavigationGuard(true, {
    title: 'Sair desta tela?',
    message: 'O cronômetro continua correndo e os avisos continuam valendo. Volte à aba Simulado quando quiser; para parar, use "Encerrar simulado".',
    cancelLabel: 'Ficar no simulado',
    confirmLabel: 'Sair da tela',
  });

  // Botão voltar do aparelho: pergunta antes de encerrar (nunca fecha o simulado de uma vez).
  useBackButton(() => setShowExit(true));

  // Acabou o tempo.
  useEffect(() => {
    if (remaining <= 0) onEnd();
  }, [remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avisos na tela. Os que já tinham passado quando o app abriu já tocaram como notificação: não repetem.
  useEffect(() => {
    const result = milestonesToAnnounce(remaining, firedRef.current, session.speed);
    firedRef.current = result.fired;
    if (result.announce) setToast(result.announce);
  }, [remaining]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const strokeOffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
  const startedLabel = new Date(session.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const template = session.template;

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Iniciado às {startedLabel}</p>
          <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{template.name}</h2>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {template.strictMode && (
            <span className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full text-[10px] font-black text-red-700 uppercase tracking-widest dark:text-red-400">
              <Icon name="lock" className="text-[9px]" /> Estrito
            </span>
          )}
          {session.speed > 1 && (
            <span className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
              Dev ×{session.speed}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col items-center gap-3">
        <div
          className="relative flex items-center justify-center aspect-square"
          style={{ width: 'min(320px, 100%, 40vh)' }}
          role="timer"
          aria-label={`${formatHMS(secondsLeft)} restantes`}
        >
          <svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-400" strokeWidth="6" />
            <circle
              cx="100" cy="100" r="90" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeOffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="flex flex-col items-center gap-1 z-10">
            <span
              data-testid="simulado-clock"
              className="font-black tabular-nums tracking-tighter leading-none"
              style={{ color, fontSize: 'clamp(1.75rem, 10vw, 3.25rem)' }}
            >
              {formatHMS(secondsLeft)}
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {paused ? 'Pausado' : 'restantes'}
            </span>
          </div>
        </div>

        {template.areas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {template.areas.map(a => (
              <span
                key={a.name}
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: a.color + '20', color: a.color }}
              >
                {a.name}
              </span>
            ))}
          </div>
        )}
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {Math.round(progress * 100)}% concluído
        </p>
      </div>

      {isNative && alerts.status === 'denied' && (
        <p className="flex items-start gap-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-snug">
          <Icon name="bell-slash" className="mt-0.5" />
          Avisos com a tela bloqueada desligados. Para recebê-los, permita as notificações do Sprint nas configurações do Android.
        </p>
      )}

      {isNative && alerts.status === 'on' && !alerts.exact && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 p-3">
          <Icon name="bell" className="mt-0.5 text-amber-700 dark:text-amber-400" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 leading-snug">
              Com a tela bloqueada o Android pode atrasar os avisos em alguns minutos. Para eles tocarem na hora, permita
              "Alarmes e lembretes" para o Sprint.
            </p>
            <button
              onClick={onAllowExact}
              className="px-4 py-2 rounded-xl bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
            >
              Permitir alarmes exatos
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {!template.strictMode && (
          <button
            onClick={paused ? onResume : onPause}
            className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-white"
            style={{ backgroundColor: color }}
          >
            <Icon name={paused ? 'play' : 'pause'} />
            {paused ? 'Retomar' : 'Pausar'}
          </button>
        )}
        <button
          onClick={() => setShowExit(true)}
          className="w-full py-3 text-gray-500 dark:text-gray-400 font-black text-[11px] uppercase tracking-widest hover:text-red-500 transition-colors"
        >
          Encerrar simulado
        </button>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="fixed top-[max(env(safe-area-inset-top,0px),1.5rem)] inset-x-4 z-[80] flex justify-center pointer-events-none animate-pop-in">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white" style={{ backgroundColor: color }}>
            <Icon name="bell" />
            <span className="text-sm font-black uppercase tracking-widest">{toast.label}</span>
          </div>
        </div>
      )}

      {showExit && (
        <ConfirmDialog
          icon="triangle-exclamation"
          title="Encerrar simulado?"
          confirmLabel="Sim, encerrar"
          cancelLabel="Continuar simulado"
          onConfirm={() => { setShowExit(false); onEnd(); }}
          onCancel={() => setShowExit(false)}
        >
          {isDevMode
            ? `Modo desenvolvedor: o simulado será registrado como concluído, com a duração total (${template.durationMinutes} min).`
            : 'O tempo usado até agora será registrado como a duração real, e você ainda poderá preencher o gabarito.'}
        </ConfirmDialog>
      )}
    </div>
  );
};

export default SimuladoRunnerView;
