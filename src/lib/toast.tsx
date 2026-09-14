import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastTipo = 'sucesso' | 'erro' | 'info' | 'aviso';

export type ToastItem = { id: string; mensagem: string; tipo: ToastTipo; duracao: number };

type ToastContextType = { toasts: ToastItem[]; adicionar: (mensagem: string, tipo?: ToastTipo, duracao?: number) => void; remover: (id: string) => void };

const ToastContext = createContext<ToastContextType | null>(null);

/** Substitui os `window.alert` espalhados pelo sistema (achado de UX,
    2026-09-13) — o alert nativo do navegador trava a tela inteira até
    alguém clicar OK, péssimo em fluxo rápido de operação (ex.: marcar 10
    itens de checklist em sequência). Toast empilha, some sozinho, não
    bloqueia nada. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const contadorRef = useRef(0);

  const remover = useCallback((id: string) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback(
    (mensagem: string, tipo: ToastTipo = 'info', duracao = tipo === 'erro' ? 6000 : tipo === 'aviso' ? 5000 : 4000) => {
      const id = String(++contadorRef.current);
      // no máximo 5 ao mesmo tempo — o 6º empurra o mais antigo pra fora,
      // nunca deixa a pilha crescer indefinidamente numa tela com muitos
      // erros em sequência.
      setToasts((atual) => [...atual.slice(-4), { id, mensagem, tipo, duracao }]);
      if (duracao > 0) setTimeout(() => remover(id), duracao);
    },
    [remover]
  );

  return (
    <ToastContext.Provider value={{ toasts, adicionar, remover }}>
      {children}
      <ToastContainer toasts={toasts} aoRemover={remover} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider');
  return ctx;
}

/** Atalho pra chamar toast fora de componente React (funções `aoFalhar`
    soltas em cada página, código de api/*.ts etc.) — `ToastBridge`
    (montado 1x em App.tsx) registra a função de verdade assim que o
    provider existe; antes disso (não deveria acontecer em uso normal)
    a chamada simplesmente não faz nada, em vez de quebrar o app. */
let _adicionar: ToastContextType['adicionar'] | null = null;
export function _registrarToast(fn: ToastContextType['adicionar']): void {
  _adicionar = fn;
}
export const toast = {
  sucesso: (msg: string) => _adicionar?.(msg, 'sucesso'),
  erro: (msg: string) => _adicionar?.(msg, 'erro'),
  info: (msg: string) => _adicionar?.(msg, 'info'),
  aviso: (msg: string) => _adicionar?.(msg, 'aviso'),
};

const ICONE: Record<ToastTipo, typeof CheckCircle2> = { sucesso: CheckCircle2, erro: XCircle, info: Info, aviso: AlertTriangle };
const CLASSES: Record<ToastTipo, string> = {
  sucesso: 'border-success/30 bg-success/10 text-success',
  erro: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-line bg-panel text-text-dim',
  aviso: 'border-pending/30 bg-pending/10 text-pending',
};

function ToastContainer({ toasts, aoRemover }: { toasts: ToastItem[]; aoRemover: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-full flex-col gap-2" style={{ maxWidth: 'min(360px, calc(100vw - 40px))' }}>
      {toasts.map((t) => (
        <ToastLinha key={t.id} toast={t} aoRemover={aoRemover} />
      ))}
    </div>
  );
}

function ToastLinha({ toast: t, aoRemover }: { toast: ToastItem; aoRemover: (id: string) => void }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisivel(true), 10); // deixa o CSS de transição pegar o estado inicial antes de animar
    return () => clearTimeout(id);
  }, []);

  const Icone = ICONE[t.tipo];

  return (
    <div
      style={{ opacity: visivel ? 1 : 0, transform: visivel ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.2s ease, transform 0.2s ease' }}
      className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 shadow-lg ${CLASSES[t.tipo]}`}
    >
      <Icone className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
      <p className="flex-1 whitespace-pre-line text-[13px] leading-snug text-text">{t.mensagem}</p>
      <button type="button" onClick={() => aoRemover(t.id)} className="mt-0.5 flex-shrink-0 text-text-faint hover:text-text">
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
