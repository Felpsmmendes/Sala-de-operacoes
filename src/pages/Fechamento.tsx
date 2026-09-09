import { Banknote, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { calcularFaturamentoPorMes, listarContratos, type FaturamentoMes } from '../lib/api/contratos';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoLinha } from '../components/charts/GraficoLinha';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarMoeda } from '../lib/status';
import type { ContratoComLead } from '../lib/types';

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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarContratos()
      .then(setContratos)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, []);

  const meses: FaturamentoMes[] = useMemo(() => calcularFaturamentoPorMes(contratos, 12), [contratos]);
  const mesAtual = meses[meses.length - 1];
  const mesAnterior = meses[meses.length - 2];
  const variacao = mesAnterior && mesAnterior.valor > 0 ? ((mesAtual.valor - mesAnterior.valor) / mesAnterior.valor) * 100 : null;

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
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {carregando ? (
          <p className="text-sm text-text-dim">Carregando…</p>
        ) : (
          <>
            <Panel className="mb-4">
              <PanelHeader titulo="Faturamento mensal" desc="Mesmo cálculo do gráfico da Sala de Operações — valor total dos contratos, independe de já ter sido pago." />
              <GraficoLinha categorias={meses.map((m) => formatarMes(m.mes))} series={[{ rotulo: 'Faturamento', corClasse: 'text-money', pontos: meses.map((m) => m.valor) }]} formatarValor={formatarMoeda} />
            </Panel>

            <Panel>
              <PanelHeader titulo="Histórico mensal" desc="Quer ver receita/custo/lucro líquido real (só o que foi pago)? Isso agora mora em Finanças." />
              <div className="overflow-x-auto">
                {/* Mini-cards de vidro leve (DESIGN.md > Tables & Lists,
                    2026-09-09), não mais <table>/<tr> crua. */}
                <div className="flex min-w-[280px] flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3 px-3 text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                    <span>Mês</span>
                    <span>Faturado</span>
                  </div>
                  {[...meses].reverse().map((m) => (
                    <div key={m.mes} className="list-row grid grid-cols-2 items-center gap-3 px-3 py-2 text-[12.5px]">
                      <span className="text-text">{formatarMes(m.mes)}</span>
                      <span className="font-mono text-text">{formatarMoeda(m.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        )}
      </Conteudo>
    </>
  );
}
