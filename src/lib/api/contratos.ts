import { supabase } from '../supabase';
import { sincronizarChecklistExtraDoContrato } from './estoque';
import { sincronizarLancamento } from './financeiro';
import type { ContratoComLead, FormaPagamento, StatusSaldo } from '../types';

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

export async function buscarContrato(id: string): Promise<ContratoComLead | null> {
  const { data, error } = await supabase.from('contratos').select('*, lead:leads(id,nome,telefone)').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as ContratoComLead | null;
}

export type NovoContrato = {
  orcamentoId: string | null;
  leadId: string;
  dataEvento: string;
  local: string | null;
  convidados: number | null;
  valorTotal: number;
  /** Custo real do frete (sem a margem de 30%) escolhido no orçamento de
      origem — 2026-09-09. Vira despesa automática em Finanças aqui,
      porque é só agora que existe um evento pra vincular a despesa (o
      orçamento em si não tem evento_id). 0/undefined = sem frete
      cobrado nesse orçamento, não gera despesa nenhuma. */
  valorFreteCusto?: number;
  /** Registro manual (2026-09-09, ver migration_020) — opcional já na
      criação, também dá pra definir/editar depois. */
  formaPagamento?: FormaPagamento | null;
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
      forma_pagamento: dados.formaPagamento ?? null,
    })
    .select('*, lead:leads(id,nome,telefone)')
    .single();
  if (error) throw new Error(error.message);

  // todo contrato já nasce com o evento operacional correspondente (1:1) —
  // é o que Agenda/Escala/Logística/Estoque vão referenciar daqui pra
  // frente, sem precisar de um passo manual de "criar evento" separado.
  // Duas chamadas separadas (REST sem transação) — se a segunda falhar,
  // desfaz a primeira em vez de deixar um contrato órfão sem evento.
  const { data: evento, error: erroEvento } = await supabase
    .from('eventos')
    .insert({ contrato_id: data.id, data_evento: dados.dataEvento, local: dados.local, convidados: dados.convidados })
    .select('id')
    .single();
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

  // frete cobrado no orçamento de origem (2026-09-09): o CUSTO real (sem
  // margem) vira despesa automática agora, vinculada ao evento que acabou
  // de nascer — é a receita (já dentro de valor_total acima) menos a
  // margem de 30% que a empresa embolsa. Sem duplicar: a receita do frete
  // entra no contrato pelo valor_total normal (sinal/saldo 20/80), a
  // despesa é um lançamento à parte, de natureza diferente.
  if (dados.valorFreteCusto && dados.valorFreteCusto > 0) {
    await sincronizarLancamento({
      eventoId: evento.id,
      prefixo: 'Frete',
      descricao: `Frete — ${(data as unknown as { lead: { nome: string } | null }).lead?.nome ?? 'evento'}`,
      valor: dados.valorFreteCusto,
      tipo: 'despesa',
      status: 'pendente',
      ativar: true,
    });
  }

  return data as unknown as ContratoComLead;
}

export type EdicaoContrato = {
  local: string | null;
  convidados: number | null;
  valorTotal: number;
  formaPagamento: FormaPagamento | null;
  observacoesBrindes: string | null;
  horarioChegadaConvidados: string | null;
  horarioChegadaEquipe: string | null;
  horarioFimServico: string | null;
  horarioSaidaEquipe: string | null;
  horarioInicioBar: string | null;
};

/** Edita um contrato já criado (2026-09-09, pedido do usuário — hoje só
    existia geração de PIX e marcação de pago, nada de editar os dados
    do contrato em si). `valorTotal` mudando aqui recalcula sinal/saldo
    sozinho (colunas geradas no banco) — mas não desmarca `sinal_pago`/
    `saldo_status` se já estavam marcados como pagos, então o valor pago
    registrado pode ficar desatualizado em relação ao novo total; sem
    solução automática pra isso, é uma conferência manual do gestor. */
export async function atualizarContrato(id: string, dados: EdicaoContrato): Promise<void> {
  const { error } = await supabase
    .from('contratos')
    .update({
      local: dados.local,
      convidados: dados.convidados,
      valor_total: dados.valorTotal,
      forma_pagamento: dados.formaPagamento,
      observacoes_brindes: dados.observacoesBrindes,
      horario_chegada_convidados: dados.horarioChegadaConvidados,
      horario_chegada_equipe: dados.horarioChegadaEquipe,
      horario_fim_servico: dados.horarioFimServico,
      horario_saida_equipe: dados.horarioSaidaEquipe,
      horario_inicio_bar: dados.horarioInicioBar,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  // observações/brindes -> checklist de carga extra (2026-09-09, "Etapa 7") —
  // ver nota em sincronizarChecklistExtraDoContrato (estoque.ts).
  await sincronizarChecklistExtraDoContrato(id, dados.observacoesBrindes);
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
    (escalas, lançamentos já gerados etc.), só marca que não vai mais
    acontecer. Sincroniza o evento operacional junto: não faz sentido
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

export type FaturamentoMes = { mes: string; valor: number };

/** Soma o valor_total dos contratos NÃO CANCELADOS por mês do evento —
    "faturamento contratado", diferente do DRE (`dre_mensal`/`listarDreMensal`,
    que só conta o que já foi de fato PAGO). Pedido do usuário (2026-09-09):
    extraído aqui pra ser reaproveitado tanto no Dashboard quanto, depois
    ("Etapa 11"), em Fechamento Mensal — sem duplicar a lógica. Sempre
    retorna `quantidadeMeses` pontos (inclusive meses sem contrato, com
    valor 0), pra dar um eixo de tempo contínuo num gráfico de tendência. */
export function calcularFaturamentoPorMes(contratos: ContratoComLead[], quantidadeMeses = 6): FaturamentoMes[] {
  const porMes = new Map<string, number>();
  for (const c of contratos) {
    if (c.status === 'cancelado') continue;
    const mes = c.data_evento.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + c.valor_total);
  }
  const hoje = new Date();
  const meses: FaturamentoMes[] = [];
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mes = d.toISOString().slice(0, 7);
    meses.push({ mes, valor: porMes.get(mes) ?? 0 });
  }
  return meses;
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
