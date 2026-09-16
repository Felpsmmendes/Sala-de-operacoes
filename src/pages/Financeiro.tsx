import { ArrowDownCircle, ArrowUpCircle, BarChart3, ChevronLeft, ChevronRight, Download, FileDown, PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { listarAuditorias } from '../lib/api/auditoria';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarEventos } from '../lib/api/eventos';
import { atualizarStatusLancamento, criarLancamento, excluirLancamento, listarDreMensal, listarLancamentos } from '../lib/api/financeiro';
import { listarFunis } from '../lib/api/funis';
import { listarLeads } from '../lib/api/leads';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { OrdenacaoColuna, type EstadoOrdenacao } from '../components/OrdenacaoColuna';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { GraficoDRE } from '../components/charts/GraficoDRE';
import { LancamentoForm } from '../components/financeiro/LancamentoForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { gerarRelatorioExecutivoPdf } from '../lib/pdfRelatorioExecutivo';
import { exportarCsv } from '../lib/exportarCsv';
import { formatarData, formatarMoeda, normalizarTexto } from '../lib/status';
import type { DreMes, Lancamento, NovoLancamento, TipoLancamento } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [dreMeses, setDreMeses] = useState<DreMes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'pagos'>('pendentes');
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [mesDre, setMesDre] = useState(() => new Date().toISOString().slice(0, 7));
  const [mesLancamentos, setMesLancamentos] = useState<string | 'todos'>('todos');
  // Ordenação da lista de lançamentos (2026-09-16, direção "redesign
  // SaaS" do usuário) — opcional; sem clicar em nenhuma coluna, a lista
  // continua na ordem que já vinha (mais recente primeiro, ver `carregar`).
  const [ordenacao, setOrdenacao] = useState<EstadoOrdenacao<'vencimento' | 'valor' | 'descricao'> | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [ls, dre] = await Promise.all([listarLancamentos(), listarDreMensal()]);
      setLancamentos(ls);
      setDreMeses(dre);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoCriar(dados: NovoLancamento) {
    setSalvando(true);
    try {
      await criarLancamento(dados);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  function aoMarcarPago(id: string, pago: boolean) {
    setLancamentos((atual) => atual.map((l) => (l.id === id ? { ...l, status: pago ? 'pago' : 'pendente' } : l)));
    atualizarStatusLancamento(id, pago ? 'pago' : 'pendente')
      .then(() => {
        toast.sucesso(pago ? 'Lançamento marcado como pago.' : 'Lançamento marcado como pendente.', { rotulo: 'Desfazer', callback: () => aoMarcarPago(id, !pago) });
        carregar();
      })
      .catch((e) => {
        aoFalhar(e);
        carregar();
      });
  }

  const mesAtual = new Date().toISOString().slice(0, 7);
  const aReceber = lancamentos.filter((l) => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
  const aPagar = lancamentos.filter((l) => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
  const receitaMes = lancamentos.filter((l) => l.tipo === 'receita' && l.status === 'pago' && (l.data_pagamento ?? '').slice(0, 7) === mesAtual).reduce((s, l) => s + l.valor, 0);
  const despesaMes = lancamentos.filter((l) => l.tipo === 'despesa' && l.status === 'pago' && (l.data_pagamento ?? '').slice(0, 7) === mesAtual).reduce((s, l) => s + l.valor, 0);

  // filtro de mês (2026-09-13) — separado do filtro de status: pago usa
  // `data_pagamento` (data real do dinheiro entrando/saindo), pendente
  // usa `vencimento` (não tem data_pagamento ainda, por definição).
  const visiveis = lancamentos.filter((l) => {
    const passaStatus = filtro === 'todos' || (filtro === 'pendentes' ? l.status === 'pendente' : l.status === 'pago');
    if (!passaStatus) return false;
    if (mesLancamentos === 'todos') return true;
    const dataRef = l.status === 'pago' ? l.data_pagamento : l.vencimento;
    return (dataRef ?? '').slice(0, 7) === mesLancamentos;
  });

  // Ordenação opcional por coluna (ver `ordenacao` acima) — CSV/métricas
  // continuam sobre `visiveis` sem ordenar, só a lista na tela muda.
  const visiveisOrdenados = !ordenacao
    ? visiveis
    : [...visiveis].sort((a, b) => {
        const cmp =
          ordenacao.campo === 'valor'
            ? a.valor - b.valor
            : ordenacao.campo === 'vencimento'
              ? (a.vencimento ?? '').localeCompare(b.vencimento ?? '')
              : normalizarTexto(a.descricao).localeCompare(normalizarTexto(b.descricao));
        return ordenacao.direcao === 'asc' ? cmp : -cmp;
      });

  function mesLancamentosDeslocado(deslocamento: number): string {
    const base = mesLancamentos === 'todos' ? mesAtual : mesLancamentos;
    const d = new Date(`${base}-01T00:00:00`);
    d.setMonth(d.getMonth() + deslocamento);
    return d.toISOString().slice(0, 7);
  }

  // DRE completo (pedido do usuário, 2026-09-09) — mudou de tela (era o
  // Fechamento Mensal, que virou só histórico de vendas), lógica intacta:
  // lê a view `dre_mensal`, nunca uma tabela própria — receita/custo/
  // lucro sempre calculados a partir dos lançamentos já pagos.
  // `mesDre` (2026-09-13) navega entre meses do HISTÓRICO já carregado —
  // nunca refaz a busca, só troca qual mês os cards/destaque mostram.
  const dreMesSelecionado = dreMeses.find((m) => m.mes.slice(0, 7) === mesDre);
  const margemSelecionada = dreMesSelecionado && dreMesSelecionado.receita_bruta > 0 ? (dreMesSelecionado.lucro_liquido / dreMesSelecionado.receita_bruta) * 100 : null;

  // Breakdown por categoria do mês do DRE (2026-09-14) — a view `dre_mensal`
  // só agrega receita/custo/lucro no total; quebrar por categoria exigiria
  // uma view nova no banco, então por ora é calculado aqui em cima dos
  // MESMOS lançamentos já carregados (pagos, com categoria, do mês
  // selecionado) — cobre os lançamentos lançados com categoria daqui pra
  // frente; os antigos (sem coluna na época) ficam de fora, sem quebrar.
  const breakdownPorCategoria = useMemo(() => {
    const doMes = lancamentos.filter((l) => l.status === 'pago' && (l.data_pagamento ?? '').slice(0, 7) === mesDre && l.categoria);
    const porCat = new Map<string, { tipo: TipoLancamento; total: number }>();
    for (const l of doMes) {
      const cat = l.categoria as string;
      const atual = porCat.get(cat) ?? { tipo: l.tipo, total: 0 };
      porCat.set(cat, { tipo: atual.tipo, total: atual.total + l.valor });
    }
    return [...porCat.entries()];
  }, [lancamentos, mesDre]);

  function mesDreDeslocado(deslocamento: number): string {
    const d = new Date(`${mesDre}-01T00:00:00`);
    d.setMonth(d.getMonth() + deslocamento);
    return d.toISOString().slice(0, 7);
  }

  /** Relatório Executivo em PDF (Fase D do roadmap, 2026-09-11) — junta
      financeiro (já carregado nesta tela) com operação/comercial/
      satisfação, buscados só quando o botão é clicado (evita pesar o
      carregamento normal da tela com dado que a maioria das visitas
      nunca usa). Nunca fabrica número: NPS sem auditoria no mês vira
      "sem dado", conversão sem histórico vira "sem dado suficiente". */
  async function aoGerarRelatorioExecutivo() {
    // sempre o mês atual de verdade — independente de qual mês o gestor
    // esteja navegando no DRE ao clicar aqui (ver `mesDre`).
    const dreMesAtual = dreMeses.find((m) => m.mes.slice(0, 7) === mesAtual);
    setGerandoRelatorio(true);
    try {
      const [contratos, eventos, leads, funis, auditorias] = await Promise.all([listarContratos(), listarEventos(), listarLeads(), listarFunis(), listarAuditorias()]);

      const contratosDoMes = contratos.filter((c) => c.status !== 'cancelado' && c.data_evento.slice(0, 7) === mesAtual);
      const faturamentoContratado = contratosDoMes.reduce((s, c) => s + c.valor_total, 0);
      const faturamentoRecebidoMes = contratosDoMes.reduce((s, c) => s + (c.sinal_pago ? c.valor_sinal : 0) + (c.saldo_status === 'quitado' ? c.valor_saldo : 0), 0);
      const faturamentoAReceberMes = Math.max(0, faturamentoContratado - faturamentoRecebidoMes);
      const contratosTravadosD15 = contratos.filter((c) => c.status !== 'cancelado' && c.saldo_status !== 'quitado' && diasAteEvento(c.data_evento) <= 15 && diasAteEvento(c.data_evento) >= 0).length;

      const eventosDoMes = eventos.filter((e) => e.status !== 'cancelado' && e.data_evento.slice(0, 7) === mesAtual);
      const convidadosAtendidos = eventosDoMes.reduce((s, e) => s + (e.convidados ?? 0), 0);
      const escalasDoMes = await listarEscalasDosEventos(eventosDoMes.map((e) => e.id));
      const escalasConfirmadasNoMes = escalasDoMes.filter((e) => e.status === 'confirmado').length;

      const funisPorId = new Map(funis.map((f) => [f.id, f]));
      const leadsNovosNoMes = leads.filter((l) => l.criado_em.slice(0, 7) === mesAtual).length;
      const leadsEmNegociacao = leads.filter((l) => funisPorId.get(l.status)?.papel == null).length;
      const leadsGanhosTotal = leads.filter((l) => funisPorId.get(l.status)?.papel === 'ganho').length;
      const leadsPerdidosTotal = leads.filter((l) => funisPorId.get(l.status)?.papel === 'perdido').length;

      const auditoriasDoMes = auditorias.filter((a) => a.criado_em.slice(0, 7) === mesAtual);
      const comNota = auditoriasDoMes.filter((a) => a.nps_nota != null);
      const npsMedioNoMes = comNota.length > 0 ? comNota.reduce((s, a) => s + (a.nps_nota as number), 0) / comNota.length : null;

      gerarRelatorioExecutivoPdf({
        mesRotulo: formatarMes(`${mesAtual}-01`),
        faturamentoContratado,
        faturamentoRecebido: faturamentoRecebidoMes,
        faturamentoAReceber: faturamentoAReceberMes,
        receitaBrutaDre: dreMesAtual?.receita_bruta ?? 0,
        custosDre: dreMesAtual?.custos_totais ?? 0,
        lucroLiquidoDre: dreMesAtual?.lucro_liquido ?? 0,
        eventosNoMes: eventosDoMes.length,
        convidadosAtendidos,
        escalasNoMes: escalasDoMes.length,
        escalasConfirmadasNoMes,
        leadsNovosNoMes,
        leadsEmNegociacao,
        leadsGanhosTotal,
        leadsPerdidosTotal,
        npsMedioNoMes,
        eventosAuditadosNoMes: auditoriasDoMes.length,
        contratosTravadosD15,
      });
    } catch (e) {
      aoFalhar(e);
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Finanças" subtitulo="Despesas de campo, entradas de sinal e conciliação rápida." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={ArrowUpCircle} rotulo="A receber" valor={formatarMoeda(aReceber)} legenda="Receitas pendentes" categoria="dinheiro" />
          <MetricCard Icone={ArrowDownCircle} rotulo="A pagar" valor={formatarMoeda(aPagar)} legenda="Despesas pendentes" categoria="dinheiro" />
          <MetricCard Icone={Wallet} rotulo="Receita paga no mês" valor={formatarMoeda(receitaMes)} legenda="Inclui sinal/saldo de contratos" categoria="dinheiro" />
          <MetricCard Icone={Scale} rotulo="Saldo do mês" valor={formatarMoeda(receitaMes - despesaMes)} legenda="Receita paga − despesa paga" categoria="dinheiro" />
        </MetricGrid>

        {erro && <AlertaBanner tom="perigo" className="mb-4">{erro}</AlertaBanner>}

        <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
          <Panel>
            <PanelHeader titulo="Novo lançamento" desc="Sinal e saldo de contrato entram sozinhos ao marcar como pago em Contratos — aqui é pra despesas e receitas avulsas." />
            <LancamentoForm onSalvar={aoCriar} salvando={salvando} />
          </Panel>
          <Panel>
            <PanelHeader titulo="Composição do mês" desc="Só valores pagos" />
            <GraficoDonut
              formatarValor={formatarMoeda}
              centroRotulo="Movimentado"
              fatias={[
                { rotulo: 'Receita paga', valor: receitaMes, corClasse: 'text-success' },
                { rotulo: 'Despesa paga', valor: despesaMes, corClasse: 'text-danger' },
              ]}
            />
          </Panel>
        </div>

        <Panel>
          <PanelHeader
            titulo="Lançamentos"
            desc={carregando ? undefined : `${visiveis.length} de ${lancamentos.length}`}
            acao={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-sm border border-line">
                  <button type="button" disabled={mesLancamentos === 'todos'} onClick={() => setMesLancamentos(mesLancamentosDeslocado(-1))} className="px-2 py-1.5 text-text-dim hover:bg-raised hover:text-text disabled:opacity-30" title="Mês anterior">
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMesLancamentos((atual) => (atual === 'todos' ? mesAtual : 'todos'))}
                    className="min-w-[92px] px-2 py-1.5 text-center font-mono text-[12px] font-semibold text-text hover:bg-raised"
                  >
                    {mesLancamentos === 'todos' ? 'Todos os meses' : formatarMes(mesLancamentos)}
                  </button>
                  <button
                    type="button"
                    disabled={mesLancamentos === 'todos' || mesLancamentos >= mesAtual}
                    onClick={() => setMesLancamentos(mesLancamentosDeslocado(1))}
                    className="px-2 py-1.5 text-text-dim hover:bg-raised hover:text-text disabled:opacity-30"
                    title="Próximo mês"
                  >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
                  {(['pendentes', 'pagos', 'todos'] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setFiltro(f)} className={`rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${filtro === f ? 'bg-raised text-money' : 'text-text-dim hover:text-text'}`}>
                      {f === 'pendentes' ? 'Pendentes' : f === 'pagos' ? 'Pagos' : 'Todos'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={visiveis.length === 0}
                  onClick={() =>
                    exportarCsv(
                      [
                        ['Tipo', 'Descrição', 'Valor', 'Vencimento', 'Status', 'Pago em', 'Observações'],
                        ...visiveis.map((l) => [
                          l.tipo === 'receita' ? 'Receita' : 'Despesa',
                          l.descricao,
                          formatarMoeda(l.valor),
                          l.vencimento ? formatarData(l.vencimento) : '—',
                          l.status === 'pago' ? 'Pago' : 'Pendente',
                          l.data_pagamento ? formatarData(l.data_pagamento) : '—',
                          l.observacoes ?? '—',
                        ]),
                      ],
                      `lancamentos-${mesLancamentos}-${filtro}`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-40"
                >
                  <Download className="h-3 w-3" strokeWidth={2} />
                  Exportar CSV
                </button>
              </div>
            }
          />

          {carregando ? (
            <SkeletonLinhas />
          ) : visiveis.length === 0 ? (
            <EstadoVazio Icone={Wallet} titulo="Nenhum lançamento aqui" />
          ) : (
            <div className="flex flex-col gap-2">
              {/* Cabeçalho ordenável (2026-09-16) — mesmas 3 colunas que já
                  aparecem em cada mini-card abaixo. */}
              <div className="flex items-center gap-4 px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                <OrdenacaoColuna campo="descricao" rotulo="Descrição" ordenacao={ordenacao} onMudar={setOrdenacao} />
                <OrdenacaoColuna campo="valor" rotulo="Valor" ordenacao={ordenacao} onMudar={setOrdenacao} />
                <OrdenacaoColuna campo="vencimento" rotulo="Vencimento" ordenacao={ordenacao} onMudar={setOrdenacao} />
              </div>
              {/* Mini-card de vidro leve por lançamento (DESIGN.md > Tables &
                  Lists, 2026-09-09) — pago ganha um tom verde bem sutil
                  (é dinheiro, categoria da tela), pendente fica neutro. */}
              {visiveisOrdenados.map((l) => (
                <div
                  key={l.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm ${l.status === 'pago' ? 'list-row-tint' : 'list-row'}`}
                  style={l.status === 'pago' ? ({ '--row-color': 'var(--color-money)' } as CSSProperties) : undefined}
                >
                  <div className="min-w-0">
                    <strong className={l.tipo === 'receita' ? 'text-success' : 'text-text'}>{l.tipo === 'receita' ? '+' : '−'} {formatarMoeda(l.valor)}</strong>
                    <span className="ml-2 text-text">{l.descricao}</span>
                    {l.categoria && <span className="ml-2 rounded-full border border-line bg-input px-2 py-0.5 text-[10px] text-text-faint">{l.categoria}</span>}
                    <p className="text-[11.5px] text-text-faint">
                      {l.vencimento ? `vence ${formatarData(l.vencimento)}` : 'sem vencimento'}
                      {l.data_pagamento ? ` · pago em ${formatarData(l.data_pagamento)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tom={l.status === 'pago' ? 'sucesso' : 'pendente'} texto={l.status === 'pago' ? 'Pago' : 'Pendente'} />
                    <button
                      type="button"
                      onClick={() => aoMarcarPago(l.id, l.status !== 'pago')}
                      className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text"
                    >
                      {l.status === 'pago' ? 'Marcar pendente' : 'Marcar pago'}
                    </button>
                    <button type="button" onClick={() => excluirLancamento(l.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}

              {/* Linha de total fixa (2026-09-16, "redesign visual" do
                  usuário) — soma só do que está visível agora (filtro de
                  status/mês já aplicado), não da tabela toda. */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 pt-3 text-sm">
                <span className="font-mono text-[11px] uppercase tracking-wide text-text-faint">Total ({visiveis.length} lançamento{visiveis.length === 1 ? '' : 's'})</span>
                <div className="flex gap-4">
                  <span className="font-mono font-semibold text-success">+ {formatarMoeda(visiveis.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0))}</span>
                  <span className="font-mono font-semibold text-danger">− {formatarMoeda(visiveis.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0))}</span>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* DRE completo — mudou do Fechamento Mensal pra cá (2026-09-09),
            mesma lógica de sempre (view dre_mensal, só lançamentos pagos). */}
        <Panel className="mt-4">
          <PanelHeader
            titulo="DRE — receita, custo e lucro líquido"
            desc="Sempre calculado a partir dos lançamentos pagos, nunca digitado à parte."
            acao={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-sm border border-line">
                  <button type="button" onClick={() => setMesDre(mesDreDeslocado(-1))} className="px-2 py-1.5 text-text-dim hover:bg-raised hover:text-text" title="Mês anterior">
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <span className="min-w-[64px] text-center font-mono text-[12px] font-semibold text-text">{formatarMes(mesDre)}</span>
                  <button type="button" disabled={mesDre >= mesAtual} onClick={() => setMesDre(mesDreDeslocado(1))} className="px-2 py-1.5 text-text-dim hover:bg-raised hover:text-text disabled:opacity-30" title="Próximo mês">
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                {mesDre !== mesAtual && (
                  <button type="button" onClick={() => setMesDre(mesAtual)} className="rounded-sm border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-text-faint hover:bg-raised hover:text-text">
                    Mês atual
                  </button>
                )}
                <button
                  type="button"
                  disabled={gerandoRelatorio}
                  onClick={aoGerarRelatorioExecutivo}
                  className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text disabled:opacity-50"
                >
                  <FileDown className="h-3.5 w-3.5" strokeWidth={2} /> {gerandoRelatorio ? 'Gerando…' : 'Relatório Executivo (PDF)'}
                </button>
              </div>
            }
          />
          <MetricGrid>
            <MetricCard Icone={TrendingUp} rotulo={`Receita bruta — ${formatarMes(mesDre)}`} valor={formatarMoeda(dreMesSelecionado?.receita_bruta ?? 0)} legenda="Lançamentos de receita pagos" categoria="dinheiro" />
            <MetricCard Icone={PiggyBank} rotulo={`Custos — ${formatarMes(mesDre)}`} valor={formatarMoeda(dreMesSelecionado?.custos_totais ?? 0)} legenda="Lançamentos de despesa pagos" categoria="dinheiro" />
            <MetricCard Icone={BarChart3} rotulo={`Lucro líquido — ${formatarMes(mesDre)}`} valor={formatarMoeda(dreMesSelecionado?.lucro_liquido ?? 0)} legenda="Receita − custos" categoria="dinheiro" />
            <MetricCard Icone={BarChart3} rotulo={`Margem — ${formatarMes(mesDre)}`} valor={margemSelecionada != null ? `${margemSelecionada.toFixed(1)}%` : '—'} legenda="Lucro líquido / receita bruta" categoria="dinheiro" />
          </MetricGrid>

          {carregando ? (
            <SkeletonLinhas />
          ) : dreMeses.length === 0 ? (
            <EstadoVazio Icone={Wallet} titulo="Nenhum lançamento pago ainda" />
          ) : (
            <>
              <div className="mb-4">
                <GraficoDRE meses={dreMeses} formatarMes={formatarMes} formatarValor={formatarMoeda} />
              </div>
              <div className="overflow-x-auto">
                {/* Lista de meses do DRE em mini-cards de vidro leve (DESIGN.md >
                    Tables & Lists, 2026-09-09), não mais <table>/<tr> crua —
                    cabeçalho de coluna repousa direto sobre o vidro do Panel. */}
                <div className="flex min-w-[520px] flex-col gap-2">
                  <div className="grid grid-cols-5 gap-3 px-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                    <span>Mês</span>
                    <span>Receita bruta</span>
                    <span>Custos</span>
                    <span>Lucro líquido</span>
                    <span>Margem</span>
                  </div>
                  {dreMeses.map((m) => {
                    const margem = m.receita_bruta > 0 ? (m.lucro_liquido / m.receita_bruta) * 100 : null;
                    const selecionado = m.mes.slice(0, 7) === mesDre;
                    return (
                      <div
                        key={m.mes}
                        onClick={() => setMesDre(m.mes.slice(0, 7))}
                        className={`grid cursor-pointer grid-cols-5 items-center gap-3 px-3 py-2 text-[12.5px] ${selecionado ? 'list-row-tint' : 'list-row'}`}
                        style={selecionado ? ({ '--row-color': 'var(--color-money)' } as CSSProperties) : undefined}
                      >
                        <span className="text-text">{formatarMes(m.mes)}</span>
                        <span className="font-mono text-success">{formatarMoeda(m.receita_bruta)}</span>
                        <span className="font-mono text-danger">{formatarMoeda(m.custos_totais)}</span>
                        <span className="font-mono text-text">{formatarMoeda(m.lucro_liquido)}</span>
                        <span className="font-mono text-text-dim">{margem != null ? `${margem.toFixed(1)}%` : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {breakdownPorCategoria.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">Breakdown por categoria — {formatarMes(mesDre)}</p>
                  <div className="flex flex-wrap gap-2">
                    {breakdownPorCategoria.map(([cat, { tipo, total }]) => (
                      <div key={cat} className="rounded-sm border border-line bg-input px-2.5 py-1.5">
                        <p className="text-[10px] text-text-faint">{cat}</p>
                        <p className={`font-mono text-[13px] font-semibold ${tipo === 'receita' ? 'text-money' : 'text-danger'}`}>{formatarMoeda(total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </Conteudo>
    </>
  );
}
