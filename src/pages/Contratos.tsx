import { AlertTriangle, CheckCircle2, Clock, Download, FileSignature, Pencil, Plus, Search, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { bloqueioNaData, listarBloqueios } from '../lib/api/bloqueiosAgenda';
import { atualizarContrato, cancelarContrato, criarContrato, diasAteEvento, excluirContrato, listarContratos, marcarSinalPago, atualizarStatusSaldo, type EdicaoContrato } from '../lib/api/contratos';
import { listarLeads } from '../lib/api/leads';
import { listarOrcamentos } from '../lib/api/orcamentos';
import { buscarPortalPorContrato } from '../lib/api/portalCliente';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Paginacao } from '../components/Paginacao';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { RevealGroup } from '../components/ui/RevealGroup';
import { AnaliseVendas } from '../components/contratos/AnaliseVendas';
import { ConfigPix, carregarConfigPix, type ConfigPixDados } from '../components/contratos/ConfigPix';
import { ModalContratoNovo, type DadosContratoNovo } from '../components/contratos/ModalContratoNovo';
import { ModalDocumentoContrato } from '../components/contratos/ModalDocumentoContrato';
import { ModalEditarContrato } from '../components/contratos/ModalEditarContrato';
import { ModalPix } from '../components/contratos/ModalPix';
import { Checkbox } from '../components/ui/Checkbox';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { CATEGORIA_BLOQUEIO_ROTULO, formatarData, formatarMoeda, normalizarTexto } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import { exportarCsv } from '../lib/exportarCsv';
import type { BloqueioAgenda, ContratoComLead, FormaPagamento, Lead, OrcamentoCompleto, StatusContrato, StatusSaldo } from '../lib/types';

const FORMA_PAGAMENTO_ROTULO: Record<FormaPagamento, string> = { pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão' };
const STATUS_CONTRATO_ROTULO: Record<StatusContrato, string> = { ativo: 'Ativo', cancelado: 'Cancelado', concluido: 'Concluído' };

// Prazo do saldo ajustado de D-7 pra D-20 (2026-09-07, regra real da empresa mudou).
function BadgeD20({ dias, saldoQuitado }: { dias: number; saldoQuitado: boolean }) {
  if (saldoQuitado) return <Badge tom="sucesso" texto="Saldo quitado" />;
  if (dias < 0) return <Badge tom="perigo" texto={`Evento há ${Math.abs(dias)}d — saldo em aberto`} />;
  if (dias <= 20) return <Badge tom="perigo" texto={`D-${dias}: quitação obrigatória`} />;
  return <Badge tom="pendente" texto={`D-${dias} até o evento`} />;
}

const COR_ESTADO: Record<'sucesso' | 'pendente' | 'perigo' | 'neutro', string> = {
  sucesso: 'var(--color-success)',
  pendente: 'var(--color-pending)',
  perigo: 'var(--color-danger)',
  neutro: 'var(--color-line-strong)',
};

/** Marcador de uma etapa da barra de liquidação abaixo. */
function MarcadorLiquidacao({ cor, ativo, rotulo, valor }: { cor: string; ativo: boolean; rotulo: string; valor?: string }) {
  return (
    <div className="flex w-16 flex-shrink-0 flex-col items-center gap-1">
      <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: ativo ? cor : 'var(--color-raised)', border: `2px solid ${cor}` }}>
        {ativo && <CheckCircle2 className="h-2.5 w-2.5 text-[#031a18]" strokeWidth={3} />}
      </span>
      <span className="text-center text-[9.5px] font-semibold uppercase tracking-wide text-text-faint">{rotulo}</span>
      {valor && <span className="font-mono text-[10px] text-text-dim">{valor}</span>}
    </div>
  );
}

/** Barra visual "Sinal → Saldo → Liquidado" (2026-09-16, "redesign
    visual" do usuário) — resumo de 1 olhada do card inteiro de
    sinal+saldo acima, útil quando o gestor está só passando o olho por
    vários contratos. Nunca substitui os controles de cima (checkbox,
    select), é só um eco visual. */
function BarraLiquidacao({ sinalPago, saldoStatus, diasAteEvento, valorSinal, valorSaldo }: { sinalPago: boolean; saldoStatus: StatusSaldo; diasAteEvento: number; valorSinal: number; valorSaldo: number }) {
  const liquidado = saldoStatus === 'quitado';
  const estadoSaldo: keyof typeof COR_ESTADO = liquidado ? 'sucesso' : saldoStatus === 'parcial' ? 'pendente' : diasAteEvento <= 20 ? 'perigo' : 'neutro';
  return (
    <div className="mt-3 flex items-center">
      <MarcadorLiquidacao cor={COR_ESTADO[sinalPago ? 'sucesso' : 'neutro']} ativo={sinalPago} rotulo="Sinal" valor={formatarMoeda(valorSinal)} />
      <div className="h-[2px] flex-1" style={{ background: sinalPago ? COR_ESTADO.sucesso : 'var(--color-line)' }} />
      <MarcadorLiquidacao cor={COR_ESTADO[estadoSaldo]} ativo={estadoSaldo === 'sucesso'} rotulo="Saldo" valor={formatarMoeda(valorSaldo)} />
      <div className="h-[2px] flex-1" style={{ background: liquidado ? COR_ESTADO.sucesso : 'var(--color-line)' }} />
      <MarcadorLiquidacao cor={COR_ESTADO[liquidado ? 'sucesso' : 'neutro']} ativo={liquidado} rotulo="Liquidado" />
    </div>
  );
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
  const [documentoAberto, setDocumentoAberto] = useState<ContratoComLead | null>(null);
  const [portalTokenDocumento, setPortalTokenDocumento] = useState<string | null>(null);
  // Busca + filtro + paginação na lista de contratos (2026-09-16, direção
  // "redesign SaaS" do usuário) — a lista de KPIs/CSV/AnaliseVendas
  // continua sobre `contratos` inteiro, sem filtro, de propósito: isso
  // aqui é só conveniência de navegação da lista visual, nunca deveria
  // mudar o que os cards do topo contam.
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusContrato>('todos');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;
  const confirmar = useConfirmDialog();

  /** Abre o modal de documento — busca o token do Portal do Cliente na
      hora (não guarda cacheado: o portal pode não existir ainda pra
      contratos criados antes dessa etapa, ou o gestor pode ter acabado
      de gerar um agora mesmo). */
  async function aoAbrirDocumento(c: ContratoComLead) {
    setDocumentoAberto(c);
    try {
      const portal = await buscarPortalPorContrato(c.id);
      setPortalTokenDocumento(portal?.token ?? null);
    } catch {
      setPortalTokenDocumento(null);
    }
  }

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
    if (ok) cancelarContrato(c.id).then(carregar).catch((e) => toast.erro(mensagemDeErro(e)));
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
    if (ok) excluirContrato(c.id).then(carregar).catch((e) => toast.erro(mensagemDeErro(e)));
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
      toast.aviso('Este orçamento não tem data do evento definida — edite o orçamento antes de gerar o contrato.');
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
      toast.erro(mensagemDeErro(e));
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
      toast.erro(mensagemDeErro(e));
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
      toast.erro(mensagemDeErro(e));
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
      toast.sucesso(pago ? 'Sinal marcado como pago.' : 'Sinal marcado como pendente.', { rotulo: 'Desfazer', callback: () => aoMudarSinalPago(id, !pago) });
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

  const contratosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());
    return contratos.filter((c) => {
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
      if (termo && !normalizarTexto(c.lead?.nome ?? '').includes(termo)) return false;
      return true;
    });
  }, [contratos, busca, filtroStatus]);

  // volta pra página 1 sempre que a busca/filtro muda o total de
  // resultados — senão dava pra ficar "presa" numa página 3 que não
  // existe mais depois de filtrar.
  useEffect(() => {
    setPagina(1);
  }, [busca, filtroStatus]);

  const contratosPaginados = useMemo(() => contratosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA), [contratosFiltrados, pagina]);

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
            desc={
              busca || filtroStatus !== 'todos'
                ? `${contratosFiltrados.length} de ${contratos.length} contrato(s)`
                : 'Sinal e saldo de cada contrato — a regra dos 20/80 não deixa passar despercebido.'
            }
            acao={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={contratos.length === 0}
                  onClick={() =>
                    exportarCsv(
                      [
                        ['Cliente', 'Data Evento', 'Local', 'Valor Total', 'Sinal', 'Saldo', 'Status', 'Assinado em'],
                        ...contratos
                          .filter((c) => c.status !== 'cancelado')
                          .map((c) => [
                            c.lead?.nome ?? '—',
                            c.data_evento,
                            c.local ?? '—',
                            formatarMoeda(c.valor_total),
                            formatarMoeda(c.valor_sinal),
                            formatarMoeda(c.valor_saldo),
                            c.status,
                            c.contrato_assinado_em ? new Date(c.contrato_assinado_em).toLocaleDateString('pt-BR') : '—',
                          ]),
                      ],
                      `contratos-${new Date().toISOString().slice(0, 10)}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-40"
                >
                  <Download className="h-3 w-3" strokeWidth={2} />
                  Exportar CSV
                </button>
                <button type="button" onClick={() => setCriandoAberto(true)} className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12.5px] text-text-dim hover:bg-raised hover:text-text">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Criar contrato sem orçamento
                </button>
              </div>
            }
          />
          {carregando && <SkeletonLinhas />}
          {erro && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}
          {!carregando && !erro && contratos.length === 0 && (
            <EstadoVazio
              Icone={FileSignature}
              titulo="Nenhum contrato ainda"
              descricao="Gere um contrato a partir de um orçamento aceito ou crie um do zero."
              acao={
                <button type="button" onClick={() => setCriandoAberto(true)} className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-strong">
                  Criar contrato
                </button>
              }
            />
          )}

          {!carregando && !erro && contratos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" strokeWidth={2} />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente…" className="pl-8" />
              </div>
              <div className="w-44">
                <Select categoria="dinheiro" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as 'todos' | StatusContrato)}>
                  <option value="todos">Todos os status</option>
                  {(Object.keys(STATUS_CONTRATO_ROTULO) as StatusContrato[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONTRATO_ROTULO[s]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {!carregando && !erro && contratos.length > 0 && contratosFiltrados.length === 0 && (
            <EstadoVazio Icone={Search} titulo="Nenhum contrato encontrado" descricao="Ajuste a busca ou o filtro de status." />
          )}

          <RevealGroup className="flex flex-col gap-3">
            {/* Mini-card de vidro leve por contrato (DESIGN.md > Tables &
                Lists, 2026-09-09) — saldo quitado ganha um tom verde bem
                sutil (é dinheiro, categoria da tela), o resto fica neutro. */}
            {contratosPaginados.map((c) => (
              <div
                key={c.id}
                className={`p-4 ${c.saldo_status === 'quitado' ? 'list-row-tint' : 'list-row'}`}
                style={c.saldo_status === 'quitado' ? ({ '--row-color': 'var(--color-money)' } as CSSProperties) : undefined}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Avatar nome={c.lead?.nome ?? '?'} categoria="dinheiro" />
                    <div className="min-w-0">
                      <strong className="block truncate text-[15px] text-text" title={c.lead?.nome ?? undefined}>
                        {c.lead?.nome ?? '—'}
                      </strong>
                      <p className="text-[12.5px] text-text-dim">
                        {formatarData(c.data_evento)} · {c.local || <span className="text-pending">local não informado</span>} · {formatarMoeda(c.valor_total)}
                        {c.forma_pagamento && <span className="ml-1">· {FORMA_PAGAMENTO_ROTULO[c.forma_pagamento]}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <BadgeD20 dias={diasAteEvento(c.data_evento)} saldoQuitado={c.saldo_status === 'quitado'} />
                    {c.contrato_assinado_em ? (
                      <Badge tom="sucesso" texto="Contrato assinado" />
                    ) : (
                      c.documento_texto && <Badge tom="pendente" texto="Aguardando assinatura" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-sm border border-line bg-raised p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-text-faint">Sinal (20%)</span>
                      <span className="font-mono text-sm text-text">{formatarMoeda(c.valor_sinal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox rotulo="Pago" categoria="dinheiro" marcado={c.sinal_pago} onMudar={(pago) => aoMudarSinalPago(c.id, pago)} />
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
                      <div className="w-36">
                        <Select categoria="dinheiro" value={c.saldo_status} onChange={(e) => aoMudarStatusSaldo(c.id, e.target.value as StatusSaldo)}>
                          <option value="pendente">Pendente</option>
                          <option value="parcial">Parcial</option>
                          <option value="quitado">Quitado</option>
                        </Select>
                      </div>
                      {c.saldo_status !== 'quitado' && (
                        <button type="button" onClick={() => setPixAberto({ contrato: c, tipo: 'saldo' })} className="ml-auto rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-panel hover:text-text">
                          Cobrar PIX
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <BarraLiquidacao sinalPago={c.sinal_pago} saldoStatus={c.saldo_status} diasAteEvento={diasAteEvento(c.data_evento)} valorSinal={c.valor_sinal} valorSaldo={c.valor_saldo} />

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
                    <button type="button" onClick={() => aoAbrirDocumento(c)} className="flex items-center gap-1 text-[12px] font-medium text-money hover:underline">
                      <FileSignature className="h-3 w-3" strokeWidth={2} /> {c.documento_texto ? 'Ver documento' : 'Gerar documento'}
                    </button>
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
          </RevealGroup>

          <Paginacao paginaAtual={pagina} total={contratosFiltrados.length} porPagina={POR_PAGINA} onMudarPagina={setPagina} />
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
      {documentoAberto && (
        <ModalDocumentoContrato
          contrato={documentoAberto}
          portalToken={portalTokenDocumento}
          aoFechar={() => {
            setDocumentoAberto(null);
            setPortalTokenDocumento(null);
          }}
          aoSalvo={carregar}
        />
      )}
      {confirmar.dialogo}
    </>
  );
}
