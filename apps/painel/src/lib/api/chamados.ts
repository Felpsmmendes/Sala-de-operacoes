import { supabase } from '../supabase';
import type { ChamadoComEmpresa, ComentarioChamado, PrioridadeChamado, StatusChamado } from '../types';

export async function listarChamados(): Promise<ChamadoComEmpresa[]> {
  const { data, error } = await supabase.from('chamados_plataforma').select('*, empresa:empresas(id,nome)').order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as ChamadoComEmpresa[];
}

export type NovoChamado = { empresa_id: string; titulo: string; descricao: string | null; modulo: string | null; prioridade: PrioridadeChamado; responsavel: string | null };

export async function criarChamado(dados: NovoChamado): Promise<void> {
  const { error } = await supabase.from('chamados_plataforma').insert(dados);
  if (error) throw new Error(error.message);
}

/** Mudar o status mantém `resolvido_em` coerente com ele (o banco exige: só
    resolvido tem data de resolução). */
export async function atualizarChamado(id: string, dados: { status?: StatusChamado; prioridade?: PrioridadeChamado; responsavel?: string | null }): Promise<void> {
  const patch: { status?: string; prioridade?: string; responsavel?: string | null; atualizado_em: string; resolvido_em?: string | null } = { ...dados, atualizado_em: new Date().toISOString() };
  if (dados.status) patch.resolvido_em = dados.status === 'resolvido' ? new Date().toISOString() : null;
  const { error } = await supabase.from('chamados_plataforma').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirChamado(id: string): Promise<void> {
  const { error } = await supabase.from('chamados_plataforma').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listarComentarios(chamadoId: string): Promise<ComentarioChamado[]> {
  const { data, error } = await supabase.from('chamados_plataforma_comentarios').select('*').eq('chamado_id', chamadoId).order('criado_em');
  if (error) throw new Error(error.message);
  return data as ComentarioChamado[];
}

export async function adicionarComentario(chamadoId: string, autor: string | null, conteudo: string): Promise<void> {
  const { error } = await supabase.from('chamados_plataforma_comentarios').insert({ chamado_id: chamadoId, autor, conteudo });
  if (error) throw new Error(error.message);
}

/** Últimos comentários de qualquer chamado — alimenta a tela de Atividades. */
export async function listarComentariosRecentes(limite = 30): Promise<(ComentarioChamado & { chamado: { titulo: string; empresa: { nome: string } | null } | null })[]> {
  const { data, error } = await supabase
    .from('chamados_plataforma_comentarios')
    .select('*, chamado:chamados_plataforma(titulo, empresa:empresas(nome))')
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return data as unknown as (ComentarioChamado & { chamado: { titulo: string; empresa: { nome: string } | null } | null })[];
}
