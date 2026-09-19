import { supabase as supabaseGestor } from '../supabase';
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

/* Usam o client PRINCIPAL (sessão do gestor logado no app), não o do kiosk:
   a página `PontoInternoEquipe` roda dentro do Layout, sem sessão do kiosk. A
   RLS `gestor_tudo` (`eh_gestor()`) vale igual pras duas sessões. */

export async function listarFuncionariosInternos(): Promise<FuncionarioInterno[]> {
  const { data, error } = await supabaseGestor.from('funcionarios_internos').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data as FuncionarioInterno[];
}

/** Desativar = a conta continua existindo no Supabase Auth (só o gestor
    apaga uma conta de verdade, no painel do Supabase), mas some da lista
    de quem tem acesso reconhecido ao kiosk — usado quando um funcionário
    sai da empresa. */
export async function definirAtivoFuncionario(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabaseGestor.from('funcionarios_internos').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Jornada esperada + valor/hora (2026-09-13) — sem isso configurado, o
    relatório de horas não tem como calcular atraso/hora extra/quanto
    pagar pra essa pessoa (fica "jornada não configurada"). */
export type ConfigJornada = { horario_entrada_padrao: string | null; horario_saida_padrao: string | null; valor_hora: number | null; valor_hora_extra: number | null };

export async function atualizarJornadaFuncionario(id: string, dados: ConfigJornada): Promise<void> {
  const { error } = await supabaseGestor.from('funcionarios_internos').update(dados).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Registros de hoje de todo mundo, pro gestor acompanhar quem já bateu
    ponto — mesmo princípio de `listarMeusRegistrosHoje`, sem o filtro por
    funcionário (RLS `gestor_tudo` libera ver todo mundo pra essa conta). */
export async function listarRegistrosDeHoje(): Promise<PontoInternoRegistro[]> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const { data, error } = await supabaseGestor.from('ponto_interno_registros').select('*').gte('horario', inicioHoje.toISOString()).order('horario', { ascending: true });
  if (error) throw new Error(error.message);
  return data as PontoInternoRegistro[];
}

/** Todos os registros de um período — pro relatório de horas do gestor
    (2026-09-13). `inicio`/`fim` são datas 'YYYY-MM-DD'; `fim` inclui o
    dia inteiro (até 23:59:59). Limites em horário LOCAL: sem fuso, o Postgres
    lia `T00:00:00` como UTC e o dia "escorregava" 3h em Brasília. */
export async function listarRegistrosPorPeriodo(inicio: string, fim: string): Promise<PontoInternoRegistro[]> {
  const { data, error } = await supabaseGestor.from('ponto_interno_registros').select('*').gte('horario', new Date(`${inicio}T00:00:00`).toISOString()).lte('horario', new Date(`${fim}T23:59:59.999`).toISOString()).order('horario', { ascending: true });
  if (error) throw new Error(error.message);
  return data as PontoInternoRegistro[];
}
