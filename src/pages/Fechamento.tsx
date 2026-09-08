import { BarChart3, PiggyBank, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listarDreMensal } from '../lib/api/financeiro';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDRE } from '../components/charts/GraficoDRE';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarMoeda } from '../lib/status';
import type { DreMes } from '../lib/types';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

export default function Fechamento() {
  const [meses, setMeses] = useState<DreMes[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarDreMensal()
      .then(setMeses)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, []);

  const mesAtualStr = new Date().toISOString().slice(0, 7);
  const mesAtual = meses.find((m) => m.mes.slice(0, 7) === mesAtualStr);
  const margemAtual = mesAtual && mesAtual.receita_bruta > 0 ? (mesAtual.lucro_liquido / mesAtual.receita_bruta) * 100 : null;

  return (
    <>
      <Cabecalho titulo="Fechamento Mensal & DRE" subtitulo="Receita bruta, custos operacionais, margem e lucro líquido real — sempre calculado a partir dos lançamentos pagos, nunca digitado à parte." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={TrendingUp} rotulo="Receita bruta do mês" valor={formatarMoeda(mesAtual?.receita_bruta ?? 0)} legenda="Lançamentos de receita pagos" />
          <MetricCard Icone={PiggyBank} rotulo="Custos do mês" valor={formatarMoeda(mesAtual?.custos_totais ?? 0)} legenda="Lançamentos de despesa pagos" />
          <MetricCard Icone={BarChart3} rotulo="Lucro líquido do mês" valor={formatarMoeda(mesAtual?.lucro_liquido ?? 0)} legenda="Receita − custos" />
          <MetricCard Icone={BarChart3} rotulo="Margem do mês" valor={margemAtual != null ? `${margemAtual.toFixed(1)}%` : '—'} legenda="Lucro líquido / receita bruta" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {!carregando && !erro && meses.length > 0 && (
          <Panel className="mb-4">
            <PanelHeader titulo="Tendência mensal" desc="Receita, custos e lucro líquido — mesmos dados da tabela abaixo, em gráfico." />
            <GraficoDRE meses={meses} formatarMes={formatarMes} formatarValor={formatarMoeda} />
          </Panel>
        )}

        <Panel>
          <PanelHeader titulo="Histórico mensal" desc="Só considera lançamentos já pagos — pendente não entra no DRE." />
          {carregando ? (
            <p className="text-sm text-text-dim">Carregando…</p>
          ) : meses.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhum lançamento pago ainda — registre em Finanças ou marque sinal/saldo de um contrato como pago.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                    <th className="pb-2 pr-3">Mês</th>
                    <th className="pb-2 pr-3">Receita bruta</th>
                    <th className="pb-2 pr-3">Custos</th>
                    <th className="pb-2 pr-3">Lucro líquido</th>
                    <th className="pb-2">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => {
                    const margem = m.receita_bruta > 0 ? (m.lucro_liquido / m.receita_bruta) * 100 : null;
                    return (
                      <tr key={m.mes} className="border-b border-line/50">
                        <td className="py-2 pr-3 text-text">{formatarMes(m.mes)}</td>
                        <td className="py-2 pr-3 font-mono text-success">{formatarMoeda(m.receita_bruta)}</td>
                        <td className="py-2 pr-3 font-mono text-danger">{formatarMoeda(m.custos_totais)}</td>
                        <td className="py-2 pr-3 font-mono text-text">{formatarMoeda(m.lucro_liquido)}</td>
                        <td className="py-2 font-mono text-text-dim">{margem != null ? `${margem.toFixed(1)}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Conteudo>
    </>
  );
}
