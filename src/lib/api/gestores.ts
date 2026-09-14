import { supabase } from '../supabase';
import type { Gestor } from '../types';

/** Só leitura — adicionar/remover gestor continua manual pelo SQL Editor
    de propósito (ver migration_030). Esta função existe só pra
    Configurações mostrar quem tem acesso hoje, sem precisar abrir o
    Supabase pra conferir. */
export async function listarGestores(): Promise<Gestor[]> {
  const { data, error } = await supabase.from('gestores').select('*').order('criado_em', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Gestor[];
}
