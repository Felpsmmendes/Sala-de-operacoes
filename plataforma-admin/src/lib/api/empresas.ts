import { supabase } from '../supabase';
import type { Empresa, ModuloPlataforma, PlanoEmpresa, StatusEmpresa } from '../types';

export async function listarEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.from('empresas').select('*').order('criado_em', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Empresa[];
}

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
