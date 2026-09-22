import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes, type Notificacao } from '../../lib/NotificacoesContext';

const PONTO_TOM: Record<Notificacao['tom'], string> = {
  perigo: 'bg-danger',
  pendente: 'bg-pending',
  sucesso: 'bg-success',
  neutro: 'bg-text-faint',
};

function haQuanto(data: Date): string {
  const minutos = Math.floor((Date.now() - data.getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  return `há ${Math.floor(horas / 24)}d`;
}

/** Sino de notificações da topbar (2026-09-17, prompt "topbar +
    notificações") — lê de `NotificacoesContext`, que substituiu o antigo
    `AlertasContext` (só um contador) como fonte única do badge. */
export function SinoNotificacoes() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  function aoClicarNotificacao(n: Notificacao) {
    marcarLida(n.id);
    setAberto(false);
    if (n.link) navegar(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        title="Notificações"
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-line bg-raised text-text-faint transition-colors hover:border-line-strong hover:text-text"
      >
        <Bell className="h-[15px] w-[15px]" strokeWidth={1.75} />
        {naoLidas > 0 && (
          <span className="notif-badge absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="notif-dropdown absolute right-0 top-10 z-50 w-80 rounded-md border border-line bg-panel shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold text-text">Notificações</span>
            {naoLidas > 0 && (
              <button type="button" onClick={marcarTodasLidas} className="flex items-center gap-1 text-[11px] font-medium text-text-faint transition-colors hover:text-text">
                <CheckCheck className="h-3 w-3" strokeWidth={2} />
                Marcar tudo lido
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12.5px] text-text-faint">Tudo em dia ✓</p>
            ) : (
              notificacoes.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => aoClicarNotificacao(n)}
                  className={`flex w-full items-start gap-2.5 border-b border-line px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-raised ${n.lida ? 'opacity-60' : ''}`}
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${PONTO_TOM[n.tom]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium leading-snug text-text">{n.titulo}</span>
                    {n.descricao && <span className="mt-0.5 block truncate text-[11.5px] text-text-faint">{n.descricao}</span>}
                    <span className="mt-1 block font-mono text-[10px] text-text-ultra">{haQuanto(n.criadaEm)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
