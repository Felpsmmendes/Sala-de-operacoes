import { supabase } from '../supabase';
import type { ErroApp } from '../types';

/** Erros dos últimos `dias` dias, mais recentes primeiro (teto de 300 — a
    página /status agrupa por mensagem, não precisa de mais que isso). */
export async function listarErrosRecentes(dias = 7): Promise<ErroApp[]> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const { data, error } = await supabase.from('erros_app').select('*').gte('criado_em', desde).order('criado_em', { ascending: false }).limit(300);
  if (error) throw new Error(error.message);
  return data as ErroApp[];
}

export async function limparErros(): Promise<void> {
  const { error } = await supabase.from('erros_app').delete().gte('criado_em', '1970-01-01');
  if (error) throw new Error(error.message);
}
