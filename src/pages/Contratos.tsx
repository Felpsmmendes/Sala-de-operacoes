import { AlertTriangle, CheckCircle2, Clock, Pencil, Plus, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { bloqueioNaData, listarBloqueios } from '../lib/api/bloqueiosAgenda';
import { atualizarContrato, cancelarContrato, criarContrato, diasAteEvento, excluirContrato, listarContratos, marcarSinalPago, atualizarStatusSaldo, type EdicaoContrato } from '../lib/api/contratos';
import { listarLeads } from '../lib/api/leads';
import { listarOrcamentos } from '../lib/api/orcamentos';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { AnaliseVendas } from '../components/contratos/AnaliseVendas';
import { ConfigPix, carregarConfigPix, type ConfigPixDados } from '../components/contratos/ConfigPix';
import { ModalContratoNovo, type DadosContratoNovo } from '../components/contratos/ModalContratoNovo';
import { ModalEditarContrato } from '../components/contratos/ModalEditarContrato';
import { ModalPix } from '../components/contratos/ModalPix';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { CATEGORIA_BLOQUEIO_ROTULO, formatarData, formatarMoeda } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { BloqueioAgenda, ContratoComLead, FormaPagamento, Lead, OrcamentoCompleto, StatusSaldo } from '../lib/types';

const FORMA_PAGAMENTO_ROTULO: Record<FormaPagamento, string> = { pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão' };

// Prazo do saldo ajustado de D-7 pra D-20 (2026-09-07, regra real da empresa mudou).
function BadgeD20({ dias, saldoQuitado }: { dias: number; saldoQuitado: boolean }) {
  if (saldoQuitado) return <Badge tom="sucesso" texto="Saldo quitado" />;
  if (dias < 0) return <Badge tom="perigo" texto={`Evento há ${Math.abs(dias)}d — saldo em aberto`} />;
  if (dias <= 20) return <Badge tom="perigo" texto={`D-${dias}: quitação obrigatória`} />;
  return <Badge tom="pendente" texto={`D-${dias} até o evento`} />;
}

export default function Contratos() {
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [orcamentosSemContrato, setOrcamentosSemContrato] = useState<OrcamentoCompleto[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [configPix, setConfigPix] = useState<ConfigPixDados>(carregarConfigPix);
  const [pixAberto, setPixAberto] = useState<{ contrato: ContratoComLead; tipo: 'sinal' | 'saldo' } | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);
  const [criandoAberto, setCriandoAberto] = useState(false);
  const [criandoContrato, setCriandoContrato] = useState(false);
  const [editando, setEditando] = useState<ContratoComLead | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const confirmar = useConfirmDialog();

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [listaContratos, listaOrcamentos, listaLeads, listaBloqueios] = await Promise.all([listarContratos(), listarOrcamentos(), listarLeads(), listarBloqueios()]);
      setContratos(listaContratos);
      const idsComContrato = new Set(listaContratos.map((c) => c.orcamento_id).filter(Boolean));
      setOrcamentosSemContrato(listaOrcamentos.filter((o) => !idsComContrato.has(o.id) && o.itens.length > 0));
      setLeads(listaLeads);
      setBloqueios(listaBloqueios);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  /** Achado da auditoria de UX (2026-09-06): cancelar/excluir um contrato
      dependia só de `window.confirm` — o mesmo diálogo genérico do
      navegador pra "cancelar" (reversível na prática, preserva histórico)
      e pra "excluir" (cascata definitiva: evento, escala, ponto,
      cue sheet, auditoria). A exclusão — a ação mais destrutiva do
      sistema — agora exige digitar o nome do cliente pra liberar o botão;
      cancelar continua um confirm de um passo só. */
  async function aoCancelar(c: ContratoComLead) {
    const ok = await confirmar.pedir({
      titulo: 'Cancelar contrato',
      mensagem: `Cancelar o contrato de ${c.lead?.nome}? O evento correspondente na Agenda também é marcado como cancelado. O histórico (escala, lançamentos) é mantido — isso não apaga nada.`,
      textoConfirmar: 'Cancelar contrato',
    });
    if (ok) cancelarContrato(c.id).then(carregar).catch((e) => window.alert(mensagemDeErro(e)));
  }

  async function aoExcluirDefinitivo(c: ContratoComLead) {
    const nomeCliente = c.lead?.nome ?? '';
    const ok = await confirmar.pedir({
      titulo: 'Excluir contrato definitivamente',
      mensagem: `Isso apaga em cascata o evento, escala, ponto, cue sheet e auditoria ligados ao contrato de ${nomeCliente || 'este cliente'} — não tem como desfazer. Use "Cancelar" em vez disso se o negócio só caiu (preserva o histórico).`,
      textoConfirmar: 'Excluir definitivamente',
      perigo: true,
      digitarParaConfirmar: nomeCliente || undefined,
    });
    if (ok) excluirContrato(c.id).then(carregar).catch((e) => window.alert(mensagemDeErro(e)));
  }

  /** Aviso (nunca bloqueio) de data reservada por outro motivo — pedido
      do usuário, 2026-09-09. `true` = pode prosseguir (sem bloqueio, ou
      bloqueio existe mas o gestor confirmou mesmo assim). */
  async function podeProsseguirNaData(dataEvento: string): Promise<boolean> {
    const bloqueio = bloqueioNaData(bloqueios, dataEvento);
    if (!bloqueio) return true;
    return confirmar.pedir({
      titulo: 'Data com bloqueio registrado',
      mensagem: (
        <div className="flex flex-col gap-2">
          <p>
            {formatarData(dataEvento)} está marcada na Agenda como <strong>{CATEGORIA_BLOQUEIO_ROTULO[bloqueio.categoria]}</strong>
            {bloqueio.observacao && <> — {bloqueio.observacao}</>}.
          </p>
          <p>Quer gerar o contrato mesmo assim?</p>
        </div>
      ),
      textoConfirmar: 'Gerar mesmo assim',
    });
  }

  async function aoGerarContrato(orcamento: OrcamentoCompleto) {
    if (!orcamento.data_evento) {
      window.alert('Este orçamento não tem data do evento definida — edite o orçamento antes de gerar o contrato.');
      return;
    }
    if (!(await podeProsseguirNaData(orcamento.data_evento))) return;
    setGerando(orcamento.id);
    try {
      await criarContrato({
        orcamentoId: orcamento.id,
        leadId: orcamento.lead_id,
        dataEvento: orcamento.data_evento,
        local: null,
        convidados: orcamento.convidados,
        valorTotal: orcamento.valor_total,
        valorFreteCusto: orcamento.valor_frete_custo,
      });
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setGerando(null);
    }
  }

  async function aoCriarContratoDoZero(dados: DadosContratoNovo) {
    if (!(await podeProsseguirNaData(dados.dataEvento))) return;
    setCriandoContrato(true);
    try {
      await criarContrato({
        orcamentoId: null,
        leadId: dados.leadId,
        dataEvento: dados.dataEvento,
        local: dados.local,
        convidados: dados.convidados,
        valorTotal: dados.valorTotal,
        formaPagamento: dados.formaPagamento,
      });
      setCriandoAberto(false);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setCriandoContrato(false);
    }
  }

  async function aoSalvarEdicao(dados: EdicaoContrato) {
    if (!editando) return;
    setSalvandoEdicao(true);
    try {
      await atualizarContrato(editando.id, dados);
      setEditando(null);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // atualização otimista: muda o estado local na hora (sem esperar o round-trip
  // do Supabase), senão o checkbox/select "pisca de volta" pro valor antigo
  // entre o clique e a resposta da rede — reconcilia com `carregar()` no final.
  async function aoMudarSinalPago(id: string, pago: boolean) {
    setContratos((atual) => atual.map((c) => (c.id === id ? { ...c, sinal_pago: pago } : c)));
    try {
      await marcarSinalPago(id, pago);
    } finally {
      carregar();
    }
  }

  async function aoMudarStatusSaldo(id: string, status: StatusSaldo) {
    setContratos((atual) => atual.map((c) => (c.id === id ? { ...c, saldo_status: status } : c)));
    try {
      await atualizarStatusSaldo(id, status);
    } finally {
      carregar();
    }
  }

  const metricas = useMemo(() => {
    const ativos = contratos.filter((c) => c.status === 'ativo');
    const totalContratado = ativos.reduce((s, c) => s + c.valor_total, 0);
    const sinaisPendentes = ativos.filter((c) => !c.sinal_pago);
    const saldosPendentes = ativos.filter((c) => c.saldo_status !== 'quitado');
    const emRisco = ativos.filter((c) => c.saldo_status !== 'quitado' && diasAteEvento(c.data_evento) <= 20);
    return { totalContratado, sinaisPendentes, saldosPendentes, emRisco };
  }, [contratos]);

  return (
    <>
      <Cabecalho titulo="Contratos" subtitulo="Sinal de 20% no fechamento, quitação dos 80% restantes até 20 dias antes do evento." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Wallet} rotulo="Total contratado" valor={formatarMoeda(metricas.totalContratado)} legenda={`${contratos.filter((c) => c.status === 'ativo').length} contrato(s) ativo(s)`} categoria="dinheiro" />
          <MetricCard Icone={Clock} rotulo="Sinais pendentes" valor={String(metricas.sinaisPendentes.length)} legenda="Aguardando os 20%" categoria="dinheiro" />
          <MetricCard Icone={Clock} rotulo="Saldos pendentes" valor={String(metricas.saldosPendentes.length)} legenda="Aguardando os 80%" categoria="dinheiro" />
          <MetricCard Icone={AlertTriangle} rotulo="Em risco (D-20)" valor={String(metricas.emRisco.length)} legenda="Saldo não quitado, evento em 20 dias ou menos" categoria="dinheiro" />
        </MetricGrid>

        <Panel className="mb-4">
          <PanelHeader titulo="Chave PIX do negócio" desc="Usada pra gerar a cobrança (QR Code) do sinal e do saldo de cada contrato." />
          <ConfigPix onSalvar={setConfigPix} />
        </Panel>

        {orcamentosSemContrato.length > 0 && (
          <Panel className="mb-4">
            <PanelHeader titulo="Orçamentos prontos para virar contrato" desc="Gera o contrato com sinal (20%) e saldo (80%) automaticamente a partir do orçamento." />
            <div className="flex flex-col gap-2">
              {orcamentosSemContrato.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                  <div>
                    <strong className="text-text">{o.lead?.nome ?? '—'}</strong>
                    <span className="ml-2 text-text-dim">{formatarData(o.data_evento)} · {formatarMoeda(o.valor_total)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={gerando === o.id}
                    onClick={() => aoGerarContrato(o)}
                    className="rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                  >
                    {gerando === o.id ? 'Gerando…' : 'Gerar contrato'}
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel className="mb-4">
          <PanelHeader
            titulo="Contratos"
            desc="Sinal e saldo de cada contrato — a regra dos 20/80 não deixa passar despercebido."
            acao={
              <button type="button" onClick={() => setCriandoAberto(true)} className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12.5px] text-text-dim hover:bg-raised hover:text-text">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Criar contrato sem orçamento
              </button>
            }
          />
          {carregando && <p className="text-sm text-text-dim">Carregando…</p>}
          {erro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
          {!carregando && !erro && contratos.length === 0 && <p className="text-sm text-text-dim">Nenhum contrato ainda.</p>}

          <div className="flex flex-col gap-3">
            {contratos.map((c) => (
              <div key={c.id} className="rounded-md border border-line bg-input p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="text-[15px] text-text">{c.lead?.nome ?? '—'}</strong>
                    <p className="text-[12.5px] text-text-dim">
                      {formatarData(c.data_evento)} · {c.local || <span className="text-pending">local não informado</span>} · {formatarMoeda(c.valor_total)}
                      {c.forma_pagamento && <span className="ml-1">· {FORMA_PAGAMENTO_ROTULO[c.forma_pagamento]}</span>}
                    </p>
                  </div>
                  <BadgeD20 dias={diasAteEvento(c.data_evento)} saldoQuitado={c.saldo_status === 'quitado'} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-sm border border-line bg-raised p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-text-faint">Sinal (20%)</span>
                      <span className="font-mono text-sm text-text">{formatarMoeda(c.valor_sinal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[12.5px] text-text-dim">
                        <input type="checkbox" checked={c.sinal_pago} onChange={(e) => aoMudarSinalPago(c.id, e.target.checked)} className="h-3.5 w-3.5 accent-money" />
                        Pago
                      </label>
                      {!c.sinal_pago && (
                        <button type="button" onClick={() => setPixAberto({ contrato: c, tipo: 'sinal' })} className="ml-auto rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-panel hover:text-text">
                          Cobrar PIX
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-sm border border-line bg-raised p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-text-faint">Saldo (80%) — até D-20</span>
                      <span className="font-mono text-sm text-text">{formatarMoeda(c.valor_saldo)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={c.saldo_status}
                        onChange={(e) => aoMudarStatusSaldo(c.id, e.target.value as StatusSaldo)}
                        className="rounded-sm border border-line bg-input px-2 py-1 text-[12.5px] text-text outline-none focus:border-money"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="parcial">Parcial</option>
                        <option value="quitado">Quitado</option>
                      </select>
                      {c.saldo_status !== 'quitado' && (
                        <button type="button" onClick={() => setPixAberto({ contrato: c, tipo: 'saldo' })} className="ml-auto rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-panel hover:text-text">
                          Cobrar PIX
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {c.sinal_pago && c.saldo_status === 'quitado' ? (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Contrato 100% liquidado — logística liberada
                    </span>
                  ) : c.status === 'cancelado' ? (
                    <Badge tom="perigo" texto="Cancelado" />
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEditando(c)} className="flex items-center gap-1 text-[12px] font-medium text-text-dim hover:underline">
                      <Pencil className="h-3 w-3" strokeWidth={2} /> Editar
                    </button>
                    {c.status !== 'cancelado' && (
                      <button type="button" onClick={() => aoCancelar(c)} className="text-[12px] font-medium text-text-dim hover:underline">
                        Cancelar
                      </button>
                    )}
                    <button type="button" onClick={() => aoExcluirDefinitivo(c)} className="text-[12px] font-medium text-danger hover:underline">
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <AnaliseVendas contratos={contratos} />
      </Conteudo>

      {pixAberto && (
        <ModalPix
          aberto
          onFechar={() => setPixAberto(null)}
          config={configPix}
          valor={pixAberto.tipo === 'sinal' ? pixAberto.contrato.valor_sinal : pixAberto.contrato.valor_saldo}
          txid={`CTR${pixAberto.contrato.id.slice(0, 8)}`}
          descricao={`${pixAberto.tipo === 'sinal' ? 'Sinal (20%)' : 'Saldo (80%)'} — ${pixAberto.contrato.lead?.nome ?? ''}`}
        />
      )}
      {criandoAberto && <ModalContratoNovo leads={leads} onFechar={() => setCriandoAberto(false)} onCriado={aoCriarContratoDoZero} salvando={criandoContrato} />}
      {editando && <ModalEditarContrato contrato={editando} onFechar={() => setEditando(null)} onSalvar={aoSalvarEdicao} salvando={salvandoEdicao} />}
      {confirmar.dialogo}
    </>
  );
}
