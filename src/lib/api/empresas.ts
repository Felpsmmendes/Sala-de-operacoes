import { supabase } from '../supabase';
import type { Empresa, ModuloPlataforma, PlanoEmpresa, StatusEmpresa } from '../types';

/** Resolve a empresa do usuário logado (Etapa 1 / Entrega 1.3 da fundação
    multiempresa — ver documento de auditoria) — hoje sempre a Em Cena,
    já que `membros_empresa` (migration_040) só tem uma linha por gestor
    existente. `null` quando o usuário não tem vínculo nenhum (não deve
    acontecer pra quem já é gestor via `gestores`, mas cobre o caso de
    conta nova/funcionário interno, que não tem linha em `membros_empresa`
    hoje). */
export async function buscarMinhaEmpresa(userId: string): Promise<Empresa | null> {
  const { data, error } = await supabase.from('membros_empresa').select('empresa:empresas(*)').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.empresa as Empresa | null) ?? null;
}

/** Painel da plataforma (migration_041/042) — só retorna algo se o
    usuário logado estiver em `super_admins`; RLS barra qualquer outra
    conta antes mesmo de chegar aqui (`leitura_super_admin`). Nunca
    usada por telas de dentro de uma empresa — só por `Plataforma.tsx`. */
export async function listarEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.from('empresas').select('*').order('criado_em', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Empresa[];
}

/** Cadastro de empresa pela tela (migration_042) — só nome/slug; vincular
    o 1º usuário dela em `membros_empresa` continua manual (SQL Editor)
    por enquanto, é trabalho de onboarding (Fase 7), fora desta entrega. */
export async function criarEmpresa(dados: { nome: string; slug: string }): Promise<Empresa> {
  const { data, error } = await supabase.from('empresas').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as Empresa;
}

export async function atualizarPlanoEmpresa(id: string, plano: PlanoEmpresa): Promise<void> {
  const { error } = await supabase.from('empresas').update({ plano }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function atualizarStatusEmpresa(id: string, status: StatusEmpresa): Promise<void> {
  const { error } = await supabase.from('empresas').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Aba "Resumo" do painel de detalhe — MRR/datas de cobrança/saúde/
    observações, tudo digitado manualmente pelo super admin (sem
    gateway de pagamento real, ver comentário na migration_042). */
export async function atualizarResumoEmpresa(
  id: string,
  dados: { mrr: number; proxima_cobranca: string | null; ultimo_pagamento_em: string | null; saude: number; observacoes: string | null }
): Promise<void> {
  const { error } = await supabase.from('empresas').update(dados).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function atualizarModulosEmpresa(id: string, modulos: ModuloPlataforma[]): Promise<void> {
  const { error } = await supabase.from('empresas').update({ modulos_ativos: modulos }).eq('id', id);
  if (error) throw new Error(error.message);
}
