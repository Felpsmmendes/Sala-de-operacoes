import { supabasePontoInterno as supabase } from '../supabasePontoInterno';
import type { FuncionarioInterno, PontoInternoRegistro, TipoPontoInterno } from '../types';

/** Busca a própria linha de funcionário interno (RLS só deixa ver a
    própria, `auth.uid() = id`) — `null` significa que essa conta ainda
    não se cadastrou (primeiro acesso ao Ponto Eletrônico, precisa
    perguntar o nome uma vez). */
export async function obterMeuFuncionario(userId: string): Promise<FuncionarioInterno | null> {
  const { data, error } = await supabase.from('funcionarios_internos').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as FuncionarioInterno | null;
}

/** Primeiro acesso: a própria conta cria a própria linha (RLS exige
    `auth.uid() = id` no insert — nunca dá pra cadastrar em nome de outra
    conta). */
export async function cadastrarMeuNome(userId: string, nome: string): Promise<FuncionarioInterno> {
  const { data, error } = await supabase.from('funcionarios_internos').insert({ id: userId, nome }).select().single();
  if (error) throw new Error(error.message);
  return data as FuncionarioInterno;
}

/** Registros de hoje do próprio funcionário, em ordem — usado pra saber
    se o próximo toque no kiosk é "entrada" ou "saída" (o último tipo
    registrado hoje decide). */
export async function listarMeusRegistrosHoje(funcionarioId: string): Promise<PontoInternoRegistro[]> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('ponto_interno_registros')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('horario', inicioHoje.toISOString())
    .order('horario', { ascending: true });
  if (error) throw new Error(error.message);
  return data as PontoInternoRegistro[];
}

export async function baterPonto(funcionarioId: string, tipo: TipoPontoInterno): Promise<void> {
  const { error } = await supabase.from('ponto_interno_registros').insert({ funcionario_id: funcionarioId, tipo });
  if (error) throw new Error(error.message);
}

/* -------------------- Gestão (só a conta `eh_gestor()` enxerga, via RLS) -------------------- */

export async function listarFuncionariosInternos(): Promise<FuncionarioInterno[]> {
  const { data, error } = await supabase.from('funcionarios_internos').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data as FuncionarioInterno[];
}

/** Desativar = a conta continua existindo no Supabase Auth (só o gestor
    apaga uma conta de verdade, no painel do Supabase), mas some da lista
    de quem tem acesso reconhecido ao kiosk — usado quando um funcionário
    sai da empresa. */
export async function definirAtivoFuncionario(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('funcionarios_internos').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Registros de hoje de todo mundo, pro gestor acompanhar quem já bateu
    ponto — mesmo princípio de `listarMeusRegistrosHoje`, sem o filtro por
    funcionário (RLS `gestor_tudo` libera ver todo mundo pra essa conta). */
export async function listarRegistrosDeHoje(): Promise<PontoInternoRegistro[]> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.from('ponto_interno_registros').select('*').gte('horario', inicioHoje.toISOString()).order('horario', { ascending: true });
  if (error) throw new Error(error.message);
  return data as PontoInternoRegistro[];
}
