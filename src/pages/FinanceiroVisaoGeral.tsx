import { ArrowDownCircle, ArrowRight, ArrowUpCircle, Scale, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertaBanner } from '../components/AlertaBanner';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { LancamentoForm } from '../components/financeiro/LancamentoForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { Drawer } from '../components/ui/Drawer';
import { useFinanceiro } from '../hooks/useFinanceiro';
import { formatarMoeda } from '../lib/status';

function formatarMes(mes: string): string {
  const [ano, m] = mes.slice(0, 7).split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

/** `/financeiro` — Visão Geral (2026-09-19, SPEC_CAMADA2 2E, "Financeiro
    em sub-rotas"). Era a tela única `Financeiro.tsx`; agora é só a parte
    de panorama (saldo/projeção/composição), com a lista de lançamentos
    detalhada e o DRE cada um na sua própria rota (ver ContasReceber,
    ContasPagar, Dre) pra não sobrecarregar uma tela só. */
export default function FinanceiroVisaoGeral() {
  const { eventos, carregando, erro, salvando, novoAberto, setNovoAberto, aoCriar, vencidos, aReceber, aPagar, receitaMes, despesaMes, saldoMes, saldoProjetado, mesAtual } = useFinanceiro();

  return (
    <>
      <Cabecalho titulo="Finanças" subtitulo="Despesas de campo, entradas de sinal e conciliação rápida." />
      <Conteudo>
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader titulo="Saldo do mês" desc={formatarMes(mesAtual)} />
            <div className="flex flex-col gap-3">
              {(
                [
                  { rotulo: 'Receitas', valor: receitaMes, texto: 'text-success', barra: 'bg-success' },
                  { rotulo: 'Despesas', valor: despesaMes, texto: 'text-danger', barra: 'bg-danger' },
                ] as const
              ).map(({ rotulo, valor, texto, barra }) => (
                <div key={rotulo}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="text-text-dim">{rotulo}</span>
                    <span className={`font-mono font-semibold ${texto}`}>{formatarMoeda(valor)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                    <div className={`h-full rounded-full ${barra}`} style={{ width: `${Math.max(receitaMes, despesaMes, 1) > 0 ? (valor / Math.max(receitaMes, despesaMes, 1)) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-[13.5px] font-semibold text-text">Saldo</span>
                <span className={`font-mono text-[22px] font-bold ${saldoMes >= 0 ? 'text-success' : 'text-danger'}`}>{formatarMoeda(saldoMes)}</span>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader titulo="Projeção" desc="Recebido + pendente − despesas previstas, sempre separado." />
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center justify-between text-text-dim">
                <span>Receita recebida</span>
                <span className="font-mono text-text">{formatarMoeda(receitaMes)}</span>
              </div>
              <div className="flex items-center justify-between text-text-dim">
                <span>Receita pendente</span>
                <span className="font-mono text-text">{formatarMoeda(aReceber)}</span>
              </div>
              <div className="flex items-center justify-between text-text-dim">
                <span>Despesas previstas</span>
                <span className="font-mono text-danger">− {formatarMoeda(aPagar)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <strong className="text-[13.5px] text-text">Saldo projetado</strong>
                <strong className={`font-mono text-[18px] ${saldoProjetado >= 0 ? 'text-success' : 'text-danger'}`}>{formatarMoeda(saldoProjetado)}</strong>
              </div>
            </div>
          </Panel>
        </div>

        <MetricGrid>
          <MetricCard Icone={ArrowUpCircle} rotulo="A receber" valor={formatarMoeda(aReceber)} legenda="Receitas pendentes" categoria="dinheiro" comoLink="/financeiro/receber" />
          <MetricCard Icone={ArrowDownCircle} rotulo="A pagar" valor={formatarMoeda(aPagar)} legenda="Despesas pendentes" categoria="dinheiro" comoLink="/financeiro/pagar" />
          <MetricCard Icone={Wallet} rotulo="Receita paga no mês" valor={formatarMoeda(receitaMes)} legenda="Inclui sinal/saldo de contratos" categoria="dinheiro" />
          <MetricCard Icone={Scale} rotulo="Saldo do mês" valor={formatarMoeda(saldoMes)} legenda="Receita paga − despesa paga" categoria="dinheiro" />
        </MetricGrid>

        {erro && (
          <AlertaBanner tom="perigo" className="mb-4">
            {erro}
          </AlertaBanner>
        )}
        {!carregando && vencidos.length > 0 && (
          <AlertaBanner tom="perigo" titulo={`${vencidos.length} lançamento${vencidos.length > 1 ? 's' : ''} com vencimento em atraso`} className="mb-4" dispensavel>
            <p>Regularize os pagamentos vencidos para manter o fluxo de caixa.</p>
            <Link to="/financeiro/pagar" className="mt-1 inline-block font-semibold text-danger underline underline-offset-2">
              Ver vencidos →
            </Link>
          </AlertaBanner>
        )}

        <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
          <Panel>
            <PanelHeader
              titulo="Novo lançamento"
              desc="Sinal e saldo de contrato entram sozinhos ao marcar como pago em Contratos — aqui é pra despesas e receitas avulsas."
              acao={
                <button type="button" onClick={() => setNovoAberto(true)} className="rounded-sm bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                  + Novo lançamento
                </button>
              }
            />
            <p className="text-sm text-text-faint">Clique em "+ Novo lançamento" pra registrar uma despesa ou receita avulsa.</p>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3 text-[12.5px]">
              <Link to="/financeiro/receber" className="flex items-center gap-1 font-medium text-text-dim hover:text-text">
                Contas a receber <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </Link>
              <Link to="/financeiro/pagar" className="flex items-center gap-1 font-medium text-text-dim hover:text-text">
                Contas a pagar <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </Link>
              <Link to="/financeiro/dre" className="flex items-center gap-1 font-medium text-text-dim hover:text-text">
                DRE <ArrowRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </div>
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
      </Conteudo>

      {novoAberto && (
        <Drawer titulo="Novo lançamento" onFechar={() => setNovoAberto(false)}>
          <LancamentoForm eventos={eventos} onSalvar={aoCriar} salvando={salvando} />
        </Drawer>
      )}
    </>
  );
}
