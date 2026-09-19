import { BarChart3, ChevronLeft, ChevronRight, FileDown, PiggyBank, TrendingUp } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDRE } from '../components/charts/GraficoDRE';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { useFinanceiro } from '../hooks/useFinanceiro';
import { listarAuditorias } from '../lib/api/auditoria';
import { diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarEscalasDosEventos } from '../lib/api/escalas';
import { listarEventos } from '../lib/api/eventos';
import { listarFunis } from '../lib/api/funis';
import { listarLeads } from '../lib/api/leads';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { gerarRelatorioExecutivoPdf } from '../lib/pdfRelatorioExecutivo';
import { formatarMoeda } from '../lib/status';
import { toast } from '../lib/toast';
import type { TipoLancamento } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

/** `/financeiro/dre` (2026-09-19, SPEC_CAMADA2 2E) — DRE + Relatório
    Executivo em PDF, extraído do Financeiro.tsx original. Mesma lógica
    de sempre: view `dre_mensal`, nunca tabela própria — receita/custo/
    lucro sempre calculados a partir dos lançamentos já pagos. */
export default function Dre() {
  const { lancamentos, dreMeses, carregando, erro, mesAtual } = useFinanceiro();
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [mesDre, setMesDre] = useState(() => new Date().toISOString().slice(0, 7));

  const dreMesSelecionado = dreMeses.find((m) => m.mes.slice(0, 7) === mesDre);
  const margemSelecionada = dreMesSelecionado && dreMesSelecionado.receita_bruta > 0 ? (dreMesSelecionado.lucro_liquido / dreMesSelecionado.receita_bruta) * 100 : null;

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

  async function aoGerarRelatorioExecutivo() {
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
      toast.erro(mensagemDeErro(e));
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="DRE" subtitulo="Receita, custo e lucro líquido — sempre calculado a partir dos lançamentos pagos." />
      <Conteudo>
        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}
        <Panel>
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
            <EstadoVazio Icone={BarChart3} titulo="Nenhum lançamento pago ainda" />
          ) : (
            <>
              <div className="mb-4">
                <GraficoDRE meses={dreMeses} formatarMes={formatarMes} formatarValor={formatarMoeda} />
              </div>
              <div className="overflow-x-auto">
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
