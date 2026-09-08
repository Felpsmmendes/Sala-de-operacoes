import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog, type ConfirmDialogProps } from '../components/ConfirmDialog';

type PedidoConfirmacao = Omit<ConfirmDialogProps, 'aberto' | 'onConfirmar' | 'onFechar'>;

/** Envelopa `<ConfirmDialog>` numa API parecida com `window.confirm`, só que
    assíncrona: `if (!(await confirmar.pedir({ titulo, mensagem }))) return;`
    no lugar de `if (!window.confirm(...)) return;`. Renderize
    `{confirmar.dialogo}` uma vez no componente (fora de qualquer condicional
    de loop) — ele mesmo controla quando aparecer. */
export function useConfirmDialog() {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const pedir = useCallback((config: PedidoConfirmacao) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPedido(config);
    });
  }, []);

  function responder(v: boolean) {
    resolverRef.current?.(v);
    resolverRef.current = null;
    setPedido(null);
  }

  const dialogo = pedido ? <ConfirmDialog {...pedido} aberto onConfirmar={() => responder(true)} onFechar={() => responder(false)} /> : null;

  return { pedir, dialogo };
}
