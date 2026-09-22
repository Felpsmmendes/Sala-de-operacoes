import { supabase } from '../supabase';
import type { EtapaPipeline } from '../types';

export async function listarEtapas(): Promise<EtapaPipeline[]> {
  const { data, error } = await supabase.from('etapas_plataforma').select('*').order('ordem');
  if (error) throw new Error(error.message);
  return data as EtapaPipeline[];
}

/** Grava a lista inteira de uma vez (cria as novas, renomeia e reordena as
    existentes) — o editor de pipeline sempre trabalha com o conjunto todo. */
export async function salvarEtapas(etapas: Pick<EtapaPipeline, 'id' | 'nome' | 'ordem' | 'papel'>[]): Promise<void> {
  const { error } = await supabase.from('etapas_plataforma').upsert(etapas.map((e) => ({ id: e.id, nome: e.nome.trim(), ordem: e.ordem, papel: e.papel })));
  if (error) throw new Error(error.message);
}

export async function excluirEtapa(id: string): Promise<void> {
  const { error } = await supabase.from('etapas_plataforma').delete().eq('id', id);
  if (error) {
    // o banco recusa apagar etapa que ainda tem lead (FK) — mensagem em português
    throw new Error(error.message.includes('foreign key') ? 'Essa etapa ainda tem leads. Mova os leads pra outra etapa antes de excluir.' : error.message);
  }
}
