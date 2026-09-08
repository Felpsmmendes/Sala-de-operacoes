import { supabase } from '../supabase';
import { sincronizarLancamento } from './financeiro';
import type { ContratoComLead, StatusSaldo } from '../types';

/** Todo contrato tem um evento 1:1 (ver `criarContrato`) — usado só pra
    marcar o lançamento financeiro com o evento certo (pra aparecer nos
    cards do Dashboard/Ponto/etc.), nunca é obrigatório encontrar um. */
async function buscarEventoIdDoContrato(contratoId: string): Promise<string | null> {
  const { data } = await supabase.from('eventos').select('id').eq('contrato_id', contratoId).maybeSingle();
  return data?.id ?? null;
}

export async function listarContratos(): Promise<ContratoComLead[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select('*, lead:leads(id,nome,telefone)')
    .order('data_evento', { ascending: true });
  if (error) throw new Error(error.message);
  return data as unknown as ContratoComLead[];
}

export type NovoContrato = {
  orcamentoId: string | null;
  leadId: string;
  dataEvento: string;
  local: string | null;
  convidados: number | null;
  valorTotal: number;
};

export async function criarContrato(dados: NovoContrato): Promise<ContratoComLead> {
  const { data, error } = await supabase
    .from('contratos')
    .insert({
      orcamento_id: dados.orcamentoId,
      lead_id: dados.leadId,
      data_evento: dados.dataEvento,
      local: dados.local,
      convidados: dados.convidados,
      valor_total: dados.valorTotal,
    })
    .select('*, lead:leads(id,nome,telefone)')
    .single();
  if (error) throw new Error(error.message);

  // todo contrato já nasce com o evento operacional correspondente (1:1) —
  // é o que Agenda/Escala/Logística/Estoque vão referenciar daqui pra
  // frente, sem precisar de um passo manual de "criar evento" separado.
  // Duas chamadas separadas (REST sem transação) — se a segunda falhar,
  // desfaz a primeira em vez de deixar um contrato órfão sem evento.
  const { error: erroEvento } = await supabase.from('eventos').insert({
    contrato_id: data.id,
    data_evento: dados.dataEvento,
    local: dados.local,
    convidados: dados.convidados,
  });
  if (erroEvento) {
    await supabase.from('contratos').delete().eq('id', data.id);
    throw new Error(erroEvento.message);
  }

  // idem pro Portal do Cliente: nasce junto (token pronto), sem passo
  // manual — o gestor só cola o link em `/portal-cliente` quando quiser.
  const { error: erroPortal } = await supabase.from('portal_cliente').insert({ contrato_id: data.id });
  if (erroPortal) {
    await supabase.from('eventos').delete().eq('contrato_id', data.id);
    await supabase.from('contratos').delete().eq('id', data.id);
    throw new Error(erroPortal.message);
  }

  return data as unknown as ContratoComLead;
}

export async function marcarSinalPago(id: string, pago: boolean): Promise<void> {
  const { data: contrato, error } = await supabase
    .from('contratos')
    .update({ sinal_pago: pago, sinal_pago_em: pago ? new Date().toISOString().slice(0, 10) : null, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('valor_sinal, lead:leads(nome)')
    .single();
  if (error) throw new Error(error.message);

  // gera/remove o lançamento de receita correspondente — ver nota em
  // sincronizarLancamento (financeiro.ts) sobre por quê.
  const eventoId = await buscarEventoIdDoContrato(id);
  await sincronizarLancamento({
    eventoId,
    prefixo: 'Sinal (20%)',
    descricao: `Sinal (20%) — ${(contrato as unknown as { lead: { nome: string } | null }).lead?.nome ?? 'contrato'}`,
    valor: contrato.valor_sinal,
    tipo: 'receita',
    status: 'pago',
    ativar: pago,
  });
}

export async function atualizarStatusSaldo(id: string, status: StatusSaldo): Promise<void> {
  const { data: contrato, error } = await supabase
    .from('contratos')
    .update({
      saldo_status: status,
      saldo_pago_em: status === 'quitado' ? new Date().toISOString().slice(0, 10) : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select('valor_saldo, lead:leads(nome)')
    .single();
  if (error) throw new Error(error.message);

  const eventoId = await buscarEventoIdDoContrato(id);
  await sincronizarLancamento({
    eventoId,
    prefixo: 'Saldo (80%)',
    descricao: `Saldo (80%) — ${(contrato as unknown as { lead: { nome: string } | null }).lead?.nome ?? 'contrato'}`,
    valor: contrato.valor_saldo,
    tipo: 'receita',
    status: 'pago',
    ativar: status === 'quitado',
  });
}

export async function salvarChavePix(id: string, chave: string): Promise<void> {
  const { error } = await supabase.from('contratos').update({ chave_pix: chave }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Cancelamento "de verdade" do negócio — mantém todo o histórico
    (escalas, romaneio, lançamentos já gerados etc.), só marca que não vai
    mais acontecer. Sincroniza o evento operacional junto: não faz sentido
    o contrato estar cancelado e a Agenda continuar mostrando o evento como
    se fosse rolar. */
export async function cancelarContrato(id: string): Promise<void> {
  const { error } = await supabase.from('contratos').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);

  const eventoId = await buscarEventoIdDoContrato(id);
  if (eventoId) {
    const { error: erroEvento } = await supabase.from('eventos').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', eventoId);
    if (erroEvento) throw new Error(erroEvento.message);
  }
}

/** Exclusão definitiva — reservada pra contrato criado por engano (sem
    atividade real ainda). Precisa apagar o que depende do evento ANTES do
    evento (várias tabelas usam `on delete restrict` de propósito, pra
    nunca sumir com histórico operacional sem querer) — `portal_cliente`
    é a única que já cai sozinha (`on delete cascade`). */
export async function excluirContrato(id: string): Promise<void> {
  const eventoId = await buscarEventoIdDoContrato(id);
  if (eventoId) {
    await supabase.from('romaneios').delete().eq('evento_id', eventoId); // cascata: romaneio_itens
    await supabase.from('ponto_registros').delete().eq('evento_id', eventoId);
    await supabase.from('escalas').delete().eq('evento_id', eventoId);
    await supabase.from('cue_sheet_itens').delete().eq('evento_id', eventoId);
    await supabase.from('auditoria_pos_evento').delete().eq('evento_id', eventoId);
    const { error: erroEvento } = await supabase.from('eventos').delete().eq('id', eventoId);
    if (erroEvento) throw new Error(erroEvento.message);
  }

  const { error } = await supabase.from('contratos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Dias até o evento (negativo = já passou). Usado pra sinalizar a regra
    inviolável do PRD: saldo tem que estar quitado até D-20 (ajustado de
    D-7 pra D-20 em 2026-09-07, a pedido do usuário — regra real da
    empresa mudou). */
export function diasAteEvento(dataEvento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(dataEvento + 'T00:00:00');
  return Math.round((data.getTime() - hoje.getTime()) / 86400000);
}
