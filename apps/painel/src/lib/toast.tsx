import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Toast = { id: number; tipo: 'sucesso' | 'erro'; texto: string };
type ToastState = { itens: Toast[]; sucesso: (texto: string) => void; erro: (texto: string) => void };

const ToastContext = createContext<ToastState | null>(null);
let proximoId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Toast[]>([]);

  const adicionar = useCallback((tipo: Toast['tipo'], texto: string) => {
    const id = proximoId++;
    setItens((atual) => [...atual, { id, tipo, texto }]);
    setTimeout(() => setItens((atual) => atual.filter((t) => t.id !== id)), 4000);
  }, []);

  const sucesso = useCallback((texto: string) => adicionar('sucesso', texto), [adicionar]);
  const erro = useCallback((texto: string) => adicionar('erro', texto), [adicionar]);

  return (
    <ToastContext.Provider value={{ itens, sucesso, erro }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {itens.map((t) => (
          <div
            key={t.id}
            className={`toast-entrada flex items-center gap-2 rounded-md border px-3.5 py-2.5 text-[12.5px] shadow-lg ${
              t.tipo === 'sucesso' ? 'border-success/30 bg-panel text-success' : 'border-danger/30 bg-panel text-danger'
            }`}
          >
            {t.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" strokeWidth={2} /> : <AlertTriangle className="h-4 w-4 flex-shrink-0" strokeWidth={2} />}
            <span className="text-text">{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return ctx;
}
