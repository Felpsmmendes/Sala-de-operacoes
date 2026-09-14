import { supabase } from '../supabase';
import type { PortalCliente, PortalPublico } from '../types';

/** Painel do gestor (autenticado) — busca pelo contrato. */
export async function buscarPortalPorContrato(contratoId: string): Promise<PortalCliente | null> {
  const { data, error } = await supabase.from('portal_cliente').select('*').eq('contrato_id', contratoId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as PortalCliente | null;
}

/** Visão geral do gestor (2026-09-13) — todos os portais de uma vez, pra
    montar métricas agregadas (quantos assinaram, quantos ainda faltam
    etc.) em vez de só o portal do contrato selecionado na tela. */
export async function listarTodosPortais(): Promise<PortalCliente[]> {
  const { data, error } = await supabase.from('portal_cliente').select('*').order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PortalCliente[];
}

export async function atualizarMoldura(id: string, url: string): Promise<void> {
  const { error } = await supabase.from('portal_cliente').update({ moldura_arquivo_url: url || null }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function atualizarVideo(id: string, url: string): Promise<void> {
  const { error } = await supabase.from('portal_cliente').update({ video_arquivo_url: url || null }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Tela pública (sem login) — tudo abaixo passa por função RPC
 * `security definer` (ver `supabase/migration_007_seguranca.sql`), nunca
 * por select/update direto na tabela/view. Achado de auditoria
 * (2026-09-06): `using (true)` sem RPC deixava listar/alterar TODAS as
 * linhas de `portal_cliente` numa chamada de API sem filtro nenhum — o
 * token só protegia de verdade dentro do app, não no banco. Agora o
 * token é parâmetro obrigatório da função, nunca dá pra "esquecer" o
 * filtro.
 */
export async function buscarPortalPorToken(token: string): Promise<PortalPublico | null> {
  const { data, error } = await supabase.rpc('portal_obter', { p_token: token });
  if (error) throw new Error(error.message);
  return ((data as PortalPublico[]) ?? [])[0] ?? null;
}

/** Registra que o cliente abriu o link (2026-09-14, ver migration_033) —
    incrementa o contador e grava a data da 1ª abertura. Silencioso de
    propósito: uma falha aqui é só a métrica que não atualiza, nunca deve
    impedir o cliente de ver o portal. */
export async function registrarVisualizacao(token: string): Promise<void> {
  await supabase.rpc('portal_registrar_visualizacao', { p_token: token }).catch(() => {});
}

export async function aprovarMoldura(token: string): Promise<void> {
  const { error } = await supabase.rpc('portal_aprovar_moldura', { p_token: token });
  if (error) throw new Error(error.message);
}

export async function aprovarVideo(token: string): Promise<void> {
  const { error } = await supabase.rpc('portal_aprovar_video', { p_token: token });
  if (error) throw new Error(error.message);
}

/** Assinatura digital simplificada: sem certificado real (fora do escopo
    de uma ferramenta interna), mas com evidência de integridade de
    verdade — hash SHA-256 (Web Crypto, nativo do navegador) do conteúdo
    homologado no momento da assinatura, então qualquer alteração depois
    fica detectável comparando o hash gravado com o conteúdo atual. Não
    captura IP real (exigiria um serviço externo) — `assinatura_ip` fica
    null por enquanto, documentado como limitação conhecida. */
export async function assinarHomologacao(token: string, portal: Pick<PortalCliente, 'contrato_id' | 'coquetel_ids' | 'moldura_arquivo_url' | 'video_arquivo_url'>, nome: string, cpf: string): Promise<void> {
  const conteudo = JSON.stringify({
    contrato_id: portal.contrato_id,
    coquetel_ids: portal.coquetel_ids,
    moldura_arquivo_url: portal.moldura_arquivo_url,
    video_arquivo_url: portal.video_arquivo_url,
    nome,
    cpf,
    quando: new Date().toISOString(),
  });
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conteudo));
  const hash = Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { error } = await supabase.rpc('portal_assinar', { p_token: token, p_nome: nome, p_cpf: cpf, p_hash: hash });
  if (error) throw new Error(error.message);
}

/** Assinatura do CONTRATO em si (documento jurídico gerado pelo gestor)
    — evento diferente de `assinarHomologacao` acima (aprovação de
    moldura/vídeo). Mesmo padrão de hash: cobre o texto do documento no
    momento da assinatura, então qualquer edição posterior do gestor faz
    o hash gravado parar de bater com o `documento_texto` atual. RPC
    própria (`portal_assinar_contrato`) e idempotente — ver
    migration_028. */
export async function assinarContrato(token: string, portal: Pick<PortalPublico, 'contrato_id' | 'documento_texto'>, nome: string, cpf: string): Promise<void> {
  const conteudo = JSON.stringify({ contrato_id: portal.contrato_id, documento_texto: portal.documento_texto, nome, cpf, quando: new Date().toISOString() });
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(conteudo));
  const hash = Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { error } = await supabase.rpc('portal_assinar_contrato', { p_token: token, p_nome: nome, p_cpf: cpf, p_hash: hash });
  if (error) throw new Error(error.message);
}
