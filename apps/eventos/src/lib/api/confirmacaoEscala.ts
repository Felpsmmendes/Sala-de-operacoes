import { supabase } from '../supabase';
import type { ConfirmacaoEscala } from '../types';

/**
 * Tela pública (sem login) — igual ao Portal do Cliente e ao Ponto:
 * `anon` nunca tem select/update direto em `escalas`/`vw_confirmacao_escala`,
 * só via função RPC `security definer` que exige o token como parâmetro
 * (ver supabase/migrations/20260102000031_032_confirmacao_escala.sql). O token é 1 por
 * linha de escala — 1 por pessoa por evento/contrato — gerado sozinho
 * quando o gestor convoca alguém.
 */
export async function buscarConfirmacaoPorToken(token: string): Promise<ConfirmacaoEscala | null> {
  const { data, error } = await supabase.rpc('confirmacao_obter', { p_token: token });
  if (error) throw new Error(error.message);
  return ((data as ConfirmacaoEscala[]) ?? [])[0] ?? null;
}

export async function responderConfirmacao(token: string, confirmar: boolean): Promise<void> {
  const { error } = await supabase.rpc('confirmacao_responder', { p_token: token, p_confirmar: confirmar });
  if (error) throw new Error(error.message);
}

/** Link completo pra copiar/mandar pro freelancer — usado tanto na tela
    de Escala (botão "Copiar link") quanto embutido na mensagem de
    convocação (WhatsApp/copiar). */
export function montarLinkConfirmacao(token: string): string {
  return `${window.location.origin}/confirmar/${token}`;
}
