import { AlertTriangle, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/**
 * Confirmação estilizada — substitui `window.confirm` nas ações mais
 * arriscadas do sistema (achado da auditoria de UX de 2026-09-06: um
 * `window.confirm` genérico do navegador tem o mesmo peso visual pra
 * "cancelar um contrato" e pra "excluir em cascata", e um "OK" apressado
 * de madrugada não distingue os dois). Não existe em lugar nenhum do
 * projeto um botão vermelho sólido — reaproveita a mesma receita de cor
 * já usada nos banners de erro (`border-danger/30 bg-danger/10 text-danger`)
 * pra manter a identidade visual em vez de inventar um estilo novo.
 *
 * `digitarParaConfirmar`, quando presente, só libera o botão de confirmar
 * depois de digitar o texto exato (ex. o nome do cliente) — fricção extra
 * reservada pra ação mais destrutiva do sistema (excluir contrato com
 * cascata), não pra toda confirmação.
 *
 * Uso via `useConfirmDialog()` (`src/lib/useConfirmDialog.tsx`), que
 * embrulha isso num `pedir(...)` que devolve uma Promise<boolean> — a
 * mesma forma de uso de `if (!window.confirm(...)) return`, só que
 * assíncrono: `if (!(await confirmar.pedir({...}))) return`.
 */
export type ConfirmDialogProps = {
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
  digitarParaConfirmar?: string;
  aberto: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
};

export function ConfirmDialog({ titulo, mensagem, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar', perigo = false, digitarParaConfirmar, aberto, onConfirmar, onFechar }: ConfirmDialogProps) {
  const [digitado, setDigitado] = useState('');

  if (!aberto) return null;

  const bloqueado = digitarParaConfirmar != null && digitado.trim() !== digitarParaConfirmar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {perigo && <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger" strokeWidth={2} />}
            <h3 className="text-base font-semibold text-text">{titulo}</h3>
          </div>
          <button type="button" onClick={onFechar} className="flex-shrink-0 text-text-faint hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 text-[13px] leading-relaxed text-text-dim">{mensagem}</div>

        {digitarParaConfirmar != null && (
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
              Digite <span className="text-text">"{digitarParaConfirmar}"</span> para confirmar
            </span>
            <input
              autoFocus
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              className="w-full rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="rounded-sm border border-line px-4 py-2 text-sm font-medium text-text-dim hover:bg-raised hover:text-text">
            {textoCancelar}
          </button>
          <button
            type="button"
            disabled={bloqueado}
            onClick={onConfirmar}
            className={`rounded-sm px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
              perigo ? 'border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20' : 'bg-accent text-accent-ink hover:bg-accent-strong'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
