import { supabase } from '../supabase';

/** Registra 1 drink servido pro evento — chamado pela tela pública
    `/drinks/:eventoId` (sem login, mesmo molde do Ponto Eletrônico
    público, ver PontoPublico.tsx). Log append-only: cada toque é 1
    linha nova, nunca um contador que alguém decrementa — dá pra
    calcular ritmo (drinks/hora) depois a partir dos horários, e nunca
    perde histórico. */
export async function registrarDrink(eventoId: string): Promise<void> {
  const { error } = await supabase.from('registros_drink').insert({ evento_id: eventoId });
  if (error) throw new Error(error.message);
}

/** Contagem via RPC security definer (nunca lê a tabela bruta) — é o
    que a tela pública usa pra mostrar o total sem precisar de sessão
    autenticada (ver migration_026). */
export async function contarDrinksDoEvento(eventoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('contar_drinks_evento', { p_evento_id: eventoId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export type RegistroDrink = { id: string; evento_id: string; criado_em: string };

/** Registros individuais com horário — só o gestor consegue ler (RLS),
    usado pro Dashboard calcular total/ritmo real do dia. Nunca chamado
    pela tela pública. */
export async function listarRegistrosDrink(eventoIds: string[]): Promise<RegistroDrink[]> {
  if (eventoIds.length === 0) return [];
  const { data, error } = await supabase.from('registros_drink').select('id, evento_id, criado_em').in('evento_id', eventoIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as RegistroDrink[];
}

/** Ritmo médio em drinks/hora desde o primeiro registro até agora — só
    faz sentido com pelo menos 2 registros (senão "ritmo" não significa
    nada, é só 1 ponto). Usado no Dashboard, nunca fabricado quando não
    há dado o suficiente. */
export function calcularRitmoDrinksPorHora(registros: RegistroDrink[]): number | null {
  if (registros.length < 2) return null;
  const horarios = registros.map((r) => new Date(r.criado_em).getTime()).sort((a, b) => a - b);
  const duracaoHoras = (horarios[horarios.length - 1] - horarios[0]) / 3_600_000;
  if (duracaoHoras <= 0) return null;
  return registros.length / duracaoHoras;
}
