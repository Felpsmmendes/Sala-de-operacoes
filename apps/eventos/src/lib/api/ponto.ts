import { supabase } from '../supabase';
import type { EscalaPresenca } from '../types';

/** Usada tanto pela tela pública de check-in quanto pelo painel do gestor
    (por isso passa por RPC — anon não tem select direto na view desde a
    auditoria de segurança de 2026-09-06, ver migration_007). Nunca expõe
    a diária (dado de pagamento). */
export async function buscarPresencaDoEvento(eventoId: string): Promise<EscalaPresenca[]> {
  const { data, error } = await supabase.rpc('ponto_obter_presenca', { p_evento_id: eventoId });
  if (error) throw new Error(error.message);
  return (data as EscalaPresenca[]).sort((a, b) => a.membro_nome.localeCompare(b.membro_nome));
}

/** Registro de chegada sem login: qualquer um com o link do evento marca a
    própria chegada escolhendo o nome na lista de escalados (decisão do
    usuário — não precisa de PIN nem geofence, é só visibilidade
    operacional, não alimenta folha de pagamento). RPC valida server-side
    que o membro está mesmo escalado pro evento antes de inserir. */
export async function registrarChegada(eventoId: string, membroId: string): Promise<void> {
  const { error } = await supabase.rpc('ponto_registrar_chegada', { p_evento_id: eventoId, p_membro_id: membroId });
  if (error) throw new Error(error.message);
}

/** Resumo pra visão geral do gestor: presença agregada de vários eventos de
    uma vez (evita 1 query por evento na tela de "próximas datas"). */
export async function buscarPresencaResumo(eventoIds: string[]): Promise<EscalaPresenca[]> {
  if (eventoIds.length === 0) return [];
  const { data, error } = await supabase.from('vw_escala_presenca').select('*').in('evento_id', eventoIds);
  if (error) throw new Error(error.message);
  return data as EscalaPresenca[];
}
