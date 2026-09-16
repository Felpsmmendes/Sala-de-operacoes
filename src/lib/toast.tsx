import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type ToastTipo = 'sucesso' | 'erro' | 'info' | 'aviso' | 'processando';

export type ToastItem = { id: string; mensagem: string; tipo: ToastTipo; duracao: number };

type ToastContextType = { toasts: ToastItem[]; adicionar: (mensagem: string, tipo?: ToastTipo, duracao?: number) => string; remover: (id: string) => void };

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
      // devolve o id pra quem chamou (ex.: `toast.processando`) poder
      // remover manualmente quando a ação acabar, sem esperar o timeout.
      return id;
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
let _remover: ToastContextType['remover'] | null = null;
export function _registrarToast(fn: ToastContextType['adicionar']): void {
  _adicionar = fn;
}
/** Segundo bridge, ao lado de `_registrarToast` (2026-09-15, "12
    animações" do usuário) — precisa do `remover` pra `toast.processando`
    poder fechar o próprio toast assim que a promessa terminar, sem
    esperar nenhum timeout. */
export function _registrarRemocaoToast(fn: ToastContextType['remover']): void {
  _remover = fn;
}
export const toast = {
  sucesso: (msg: string) => _adicionar?.(msg, 'sucesso'),
  erro: (msg: string) => _adicionar?.(msg, 'erro'),
  info: (msg: string) => _adicionar?.(msg, 'info'),
  aviso: (msg: string) => _adicionar?.(msg, 'aviso'),
  /** Toast com indicador de "processando" (3 pontinhos) enquanto
      `promessa` não resolve — fecha sozinho ao terminar (sucesso OU
      erro), sem precisar de mais um `finally` manual em cada chamador.
      Reservado pra ação que realmente demora (gerar PDF, mandar
      WhatsApp) — não é pra virar o padrão de toda chamada de API.
      Uso: `await toast.processando(gerarPdf(...), 'Gerando PDF…')`. */
  processando: async <T,>(promessa: Promise<T>, mensagem: string): Promise<T> => {
    const id = _adicionar?.(mensagem, 'processando', 0);
    try {
      return await promessa;
    } finally {
      if (id) _remover?.(id);
    }
  },
};

const ICONE: Record<Exclude<ToastTipo, 'processando'>, typeof CheckCircle2> = { sucesso: CheckCircle2, erro: XCircle, info: Info, aviso: AlertTriangle };
const CLASSES: Record<ToastTipo, string> = {
  sucesso: 'border-success/30 bg-success/10 text-success',
  erro: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-line bg-panel text-text-dim',
  aviso: 'border-pending/30 bg-pending/10 text-pending',
  processando: 'border-line bg-panel text-text-dim',
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

  const Icone = t.tipo === 'processando' ? null : ICONE[t.tipo];

  return (
    <div
      style={{ opacity: visivel ? 1 : 0, transform: visivel ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.2s ease, transform 0.2s ease' }}
      className={`flex items-start gap-2.5 rounded-sm border px-3.5 py-3 shadow-lg ${CLASSES[t.tipo]}`}
    >
      {Icone ? (
        <Icone className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2} />
      ) : (
        <span className="mt-1.5 flex h-4 flex-shrink-0 items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="dot-bounce h-[4px] w-[4px] rounded-full bg-text-faint" style={{ animationDelay: `${i * 0.15}s` } as CSSProperties} />
          ))}
        </span>
      )}
      <p className="min-w-0 flex-1 whitespace-pre-line break-words text-[13px] leading-snug text-text">{t.mensagem}</p>
      {/* toast "processando" some sozinho quando a promessa termina — sem
          botão de fechar manual, pra não deixar quem tá vendo achar que
          dá pra cancelar a ação em andamento cancelando o aviso dela. */}
      {t.tipo !== 'processando' && (
        <button type="button" onClick={() => aoRemover(t.id)} className="mt-0.5 flex-shrink-0 text-text-faint hover:text-text">
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
