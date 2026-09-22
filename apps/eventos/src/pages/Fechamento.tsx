import { Banknote, Camera, GlassWater, Plus, Target, TrendingUp, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { calcularFaturamentoPorMes, listarContratos, type FaturamentoMes } from '../lib/api/contratos';
import { listarOrcamentos } from '../lib/api/orcamentos';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoLinha } from '../components/charts/GraficoLinha';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarMoeda } from '../lib/status';
import type { ContratoComLead, OrcamentoCompleto } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

/** Simplificado (pedido do usuário, 2026-09-09): o DRE completo (receita/
    custo/margem/lucro) saiu daqui e foi morar em Finanças — esta tela
    virou só um histórico de vendas por mês, reaproveitando a MESMA
    função (`calcularFaturamentoPorMes`, api/contratos.ts) que já
    alimenta o gráfico "Faturamento mensal" da Sala de Operações, sem
    duplicar o cálculo. */
export default function Fechamento() {
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoCompleto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarContratos(), listarOrcamentos()])
      .then(([c, o]) => {
        setContratos(c);
        setOrcamentos(o);
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, []);

  const meses: FaturamentoMes[] = useMemo(() => calcularFaturamentoPorMes(contratos, 12), [contratos]);
  const mesAtual = meses[meses.length - 1];
  const mesAnterior = meses[meses.length - 2];
  const variacao = mesAnterior && mesAnterior.valor > 0 ? ((mesAtual.valor - mesAnterior.valor) / mesAnterior.valor) * 100 : null;

  // ticket médio + clientes recorrentes do mês atual (2026-09-13) — mesmo
  // recorte de "fechado" que o resto da tela usa (não cancelado).
  const contratosDoMes = useMemo(() => contratos.filter((c) => c.status !== 'cancelado' && mesAtual && c.data_evento.slice(0, 7) === mesAtual.mes.slice(0, 7)), [contratos, mesAtual]);
  const ticketMedio = contratosDoMes.length > 0 ? contratosDoMes.reduce((s, c) => s + c.valor_total, 0) / contratosDoMes.length : 0;

  // Meta mensal (2026-09-17, "master redesign") — configurada em
  // Configurações, guardada em localStorage (não é dado de negócio,
  // é só uma referência de atingimento pra este painel).
  const metaMensal = useMemo(() => {
    try {
      return Number(localStorage.getItem('emcena_meta_mensal') ?? 0);
    } catch {
      return 0;
    }
  }, []);
  // "recorrente" olha o HISTÓRICO inteiro (não só o mês) — é sobre o
  // lead já ter fechado mais de uma vez com a Em Cena, não só neste mês.
  const clientesRecorrentes = useMemo(() => {
    const porLead = new Map<string, number>();
    for (const c of contratos) {
      if (c.status === 'cancelado' || !c.lead_id) continue;
      porLead.set(c.lead_id, (porLead.get(c.lead_id) ?? 0) + 1);
    }
    return [...porLead.values()].filter((v) => v > 1).length;
  }, [contratos]);

  // composição por categoria de serviço (2026-09-14) — o histórico acima
  // só mostra o total do mês, sem dizer SE veio mais de bar ou de atração.
  // Só dá pra saber isso puxando os itens do orçamento de origem de cada
  // contrato do mês; contrato criado do zero (sem orçamento) não entra
  // aqui — não tem como quebrar por categoria o que nunca teve item.
  const breakdownServico = useMemo(() => {
    const orcamentoIdsDoMes = new Set(contratosDoMes.filter((c) => c.orcamento_id).map((c) => c.orcamento_id as string));
    const totais = { bar: 0, atracao: 0, adicional: 0 };
    for (const orc of orcamentos) {
      if (!orcamentoIdsDoMes.has(orc.id)) continue;
      for (const item of orc.itens) {
        const cat = item.servico.categoria as keyof typeof totais;
        if (cat in totais) totais[cat] += item.valor_total ?? 0;
      }
    }
    const total = totais.bar + totais.atracao + totais.adicional;
    return { ...totais, total };
  }, [orcamentos, contratosDoMes]);

  // Comparativo anual (REVIEW_DECISOES_V2, Parte 11/16, P2) — no MESMO
  // gráfico de faturamento (não um card separado): ano atual × ano
  // anterior lado a lado por mês-calendário (Jan..Dez), só quando existe
  // dado do ano anterior — senão o gráfico continua a visão padrão
  // (últimos 12 meses corridos).
  const anoAtual = new Date().getFullYear();
  const anoAnterior = anoAtual - 1;
  const comparativoAnual = useMemo(() => {
    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const porAnoMes = new Map<string, number>();
    for (const c of contratos) {
      if (c.status === 'cancelado') continue;
      const chave = c.data_evento.slice(0, 7);
      porAnoMes.set(chave, (porAnoMes.get(chave) ?? 0) + c.valor_total);
    }
    const valoresAnoAtual = nomesMes.map((_, i) => porAnoMes.get(`${anoAtual}-${String(i + 1).padStart(2, '0')}`) ?? 0);
    const valoresAnoAnterior = nomesMes.map((_, i) => porAnoMes.get(`${anoAnterior}-${String(i + 1).padStart(2, '0')}`) ?? 0);
    return { categorias: nomesMes, valoresAnoAtual, valoresAnoAnterior, temAnoAnterior: valoresAnoAnterior.some((v) => v > 0) };
  }, [contratos, anoAtual, anoAnterior]);

  const seriesFaturamento = comparativoAnual.temAnoAnterior
    ? [
        { rotulo: String(anoAnterior), corClasse: 'text-text-faint', pontos: comparativoAnual.valoresAnoAnterior },
        { rotulo: String(anoAtual), corClasse: 'text-money', pontos: comparativoAnual.valoresAnoAtual },
      ]
    : [{ rotulo: 'Faturamento', corClasse: 'text-money', pontos: meses.map((m) => m.valor) }];
  const categoriasFaturamento = comparativoAnual.temAnoAnterior ? comparativoAnual.categorias : meses.map((m) => formatarMes(m.mes));

  return (
    <>
      <Cabecalho titulo="Fechamento Mensal" subtitulo="Histórico de vendas por mês — quanto foi fechado em contrato, mês a mês." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Banknote} rotulo="Faturado este mês" valor={formatarMoeda(mesAtual?.valor ?? 0)} legenda="Soma de contratos não cancelados" categoria="dinheiro" />
          <MetricCard
            Icone={TrendingUp}
            rotulo="Variação vs. mês anterior"
            valor={variacao != null ? `${variacao >= 0 ? '+' : ''}${variacao.toFixed(1)}%` : '—'}
            legenda={mesAnterior ? formatarMoeda(mesAnterior.valor) + ' no mês anterior' : 'Sem mês anterior pra comparar'}
            categoria="dinheiro"
          />
          <MetricCard Icone={TrendingUp} rotulo="Ticket médio do mês" valor={formatarMoeda(ticketMedio)} legenda={`${contratosDoMes.length} contrato(s) neste mês`} categoria="dinheiro" />
          <MetricCard Icone={Users} rotulo="Clientes recorrentes" valor={String(clientesRecorrentes)} legenda="Leads com mais de 1 contrato" categoria="pessoas" />
          {metaMensal > 0 && (
            <MetricCard
              Icone={Target}
              rotulo="Meta do mês"
              valor={`${Math.round(((mesAtual?.valor ?? 0) / metaMensal) * 100)}%`}
              legenda={`${formatarMoeda(mesAtual?.valor ?? 0)} de ${formatarMoeda(metaMensal)}`}
              categoria="dinheiro"
            />
          )}
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {carregando ? (
          <SkeletonLinhas />
        ) : (
          <>
            <Panel className="mb-4">
              <PanelHeader
                titulo="Faturamento mensal"
                desc={
                  comparativoAnual.temAnoAnterior
                    ? `Comparativo ${anoAnterior} × ${anoAtual}, mês a mês — valor total dos contratos, independe de já ter sido pago.`
                    : 'Últimos 12 meses — valor total dos contratos, independe de já ter sido pago.'
                }
              />
              <GraficoLinha categorias={categoriasFaturamento} series={seriesFaturamento} formatarValor={formatarMoeda} />
            </Panel>

            <Panel>
              <PanelHeader titulo="Histórico mensal" desc="Quer ver receita/custo/lucro líquido real (só o que foi pago)? Isso agora mora em Finanças." />
              <div className="overflow-x-auto">
                {/* Mini-cards de vidro leve (DESIGN.md > Tables & Lists,
                    2026-09-09), não mais <table>/<tr> crua. */}
                <div className="flex min-w-[280px] flex-col gap-2">
                  <div className="grid grid-cols-3 gap-3 px-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                    <span>Mês</span>
                    <span>Faturado</span>
                    <span>Variação</span>
                  </div>
                  {[...meses].reverse().map((m, i, arr) => {
                    const anterior = arr[i + 1];
                    const variacao = anterior && anterior.valor > 0 ? Math.round(((m.valor - anterior.valor) / anterior.valor) * 100) : null;
                    // Mês atual: borda âmbar sutil na linha (REVIEW_DECISOES_V2,
                    // Parte 11/16, P1) — não fundo amarelo, só a borda.
                    const ehMesAtual = mesAtual && m.mes === mesAtual.mes;
                    return (
                      <div key={m.mes} className={`list-row grid grid-cols-3 items-center gap-3 px-3 py-2 text-[12.5px] ${ehMesAtual ? 'border-pending/40' : ''}`}>
                        <span className="text-text">{formatarMes(m.mes)}</span>
                        <span className="font-mono text-text">{formatarMoeda(m.valor)}</span>
                        <span className={`font-mono text-[11.5px] font-semibold ${variacao == null ? 'text-text-faint' : variacao > 0 ? 'text-money' : variacao < 0 ? 'text-danger' : 'text-text-faint'}`}>
                          {variacao == null ? '—' : `${variacao > 0 ? '↑' : variacao < 0 ? '↓' : ''} ${Math.abs(variacao)}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {breakdownServico.total > 0 && (
              <Panel className="mt-4">
                <PanelHeader titulo="Composição do faturamento" desc={`Baseado nos orçamentos vinculados aos contratos de ${mesAtual ? formatarMes(mesAtual.mes) : 'este mês'}`} />
                <div className="flex flex-col gap-2">
                  {[
                    { rotulo: 'Bar Service', Icone: GlassWater, valor: breakdownServico.bar, cor: 'bg-money' },
                    { rotulo: 'Atrações fotográficas', Icone: Camera, valor: breakdownServico.atracao, cor: 'bg-schedule' },
                    { rotulo: 'Serviços adicionais', Icone: Plus, valor: breakdownServico.adicional, cor: 'bg-neutral' },
                  ]
                    .filter(({ valor }) => valor > 0)
                    .map(({ rotulo, Icone, valor, cor }) => {
                      const pct = breakdownServico.total > 0 ? Math.round((valor / breakdownServico.total) * 100) : 0;
                      return (
                        <div key={rotulo}>
                          <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                            <span className="flex items-center gap-1.5 text-text-dim">
                              <Icone className="h-3.5 w-3.5" strokeWidth={2} /> {rotulo}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[11px] text-text-faint">{pct}%</span>
                              <span className="font-mono font-semibold text-text">{formatarMoeda(valor)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                            <div className={`h-full rounded-full ${cor} opacity-70`} style={{ width: `${pct}%`, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
                <p className="mt-3 text-[11px] text-text-faint">Contratos sem orçamento vinculado não entram no breakdown por categoria.</p>
              </Panel>
            )}
          </>
        )}
      </Conteudo>
    </>
  );
}
