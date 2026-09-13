import { ArrowDownCircle, ArrowUpCircle, BarChart3, FileDown, PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { listarAuditorias } from '../lib/api/auditoria';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarEventos } from '../lib/api/eventos';
import { atualizarStatusLancamento, criarLancamento, excluirLancamento, listarDreMensal, listarLancamentos } from '../lib/api/financeiro';
import { listarFunis } from '../lib/api/funis';
import { listarLeads } from '../lib/api/leads';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { GraficoDRE } from '../components/charts/GraficoDRE';
import { LancamentoForm } from '../components/financeiro/LancamentoForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { gerarRelatorioExecutivoPdf } from '../lib/pdfRelatorioExecutivo';
import { formatarData, formatarMoeda } from '../lib/status';
import type { DreMes, Lancamento, NovoLancamento } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [dreMeses, setDreMeses] = useState<DreMes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'pagos'>('pendentes');
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

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
      .then(carregar)
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

  const visiveis = lancamentos.filter((l) => filtro === 'todos' || (filtro === 'pendentes' ? l.status === 'pendente' : l.status === 'pago'));

  // DRE completo (pedido do usuário, 2026-09-09) — mudou de tela (era o
  // Fechamento Mensal, que virou só histórico de vendas), lógica intacta:
  // lê a view `dre_mensal`, nunca uma tabela própria — receita/custo/
  // lucro sempre calculados a partir dos lançamentos já pagos.
  const dreMesAtual = dreMeses.find((m) => m.mes.slice(0, 7) === mesAtual);
  const margemAtual = dreMesAtual && dreMesAtual.receita_bruta > 0 ? (dreMesAtual.lucro_liquido / dreMesAtual.receita_bruta) * 100 : null;

  /** Relatório Executivo em PDF (Fase D do roadmap, 2026-09-11) — junta
      financeiro (já carregado nesta tela) com operação/comercial/
      satisfação, buscados só quando o botão é clicado (evita pesar o
      carregamento normal da tela com dado que a maioria das visitas
      nunca usa). Nunca fabrica número: NPS sem auditoria no mês vira
      "sem dado", conversão sem histórico vira "sem dado suficiente". */
  async function aoGerarRelatorioExecutivo() {
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

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

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
              <div className="inline-flex gap-0.5 rounded-sm border border-line bg-input p-0.5">
                {(['pendentes', 'pagos', 'todos'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFiltro(f)} className={`rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${filtro === f ? 'bg-raised text-money' : 'text-text-dim hover:text-text'}`}>
                    {f === 'pendentes' ? 'Pendentes' : f === 'pagos' ? 'Pagos' : 'Todos'}
                  </button>
                ))}
              </div>
            }
          />

          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : visiveis.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhum lançamento aqui.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Mini-card de vidro leve por lançamento (DESIGN.md > Tables &
                  Lists, 2026-09-09) — pago ganha um tom verde bem sutil
                  (é dinheiro, categoria da tela), pendente fica neutro. */}
              {visiveis.map((l) => (
                <div
                  key={l.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm ${l.status === 'pago' ? 'list-row-tint' : 'list-row'}`}
                  style={l.status === 'pago' ? ({ '--row-color': 'var(--color-money)' } as CSSProperties) : undefined}
                >
                  <div className="min-w-0">
                    <strong className={l.tipo === 'receita' ? 'text-success' : 'text-text'}>{l.tipo === 'receita' ? '+' : '−'} {formatarMoeda(l.valor)}</strong>
                    <span className="ml-2 text-text">{l.descricao}</span>
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
              <button
                type="button"
                disabled={gerandoRelatorio}
                onClick={aoGerarRelatorioExecutivo}
                className="flex items-center gap-1.5 rounded-sm border border-line px-3 py-1.5 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" strokeWidth={2} /> {gerandoRelatorio ? 'Gerando…' : 'Relatório Executivo (PDF)'}
              </button>
            }
          />
          <MetricGrid>
            <MetricCard Icone={TrendingUp} rotulo="Receita bruta do mês" valor={formatarMoeda(dreMesAtual?.receita_bruta ?? 0)} legenda="Lançamentos de receita pagos" categoria="dinheiro" />
            <MetricCard Icone={PiggyBank} rotulo="Custos do mês" valor={formatarMoeda(dreMesAtual?.custos_totais ?? 0)} legenda="Lançamentos de despesa pagos" categoria="dinheiro" />
            <MetricCard Icone={BarChart3} rotulo="Lucro líquido do mês" valor={formatarMoeda(dreMesAtual?.lucro_liquido ?? 0)} legenda="Receita − custos" categoria="dinheiro" />
            <MetricCard Icone={BarChart3} rotulo="Margem do mês" valor={margemAtual != null ? `${margemAtual.toFixed(1)}%` : '—'} legenda="Lucro líquido / receita bruta" categoria="dinheiro" />
          </MetricGrid>

          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : dreMeses.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhum lançamento pago ainda.</p>
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
                    return (
                      <div key={m.mes} className="list-row grid grid-cols-5 items-center gap-3 px-3 py-2 text-[12.5px]">
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
            </>
          )}
        </Panel>
      </Conteudo>
    </>
  );
}
