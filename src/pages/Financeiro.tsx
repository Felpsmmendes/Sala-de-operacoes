import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { atualizarStatusLancamento, criarLancamento, excluirLancamento, listarLancamentos } from '../lib/api/financeiro';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { LancamentoForm } from '../components/financeiro/LancamentoForm';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData, formatarMoeda } from '../lib/status';
import type { Lancamento, NovoLancamento } from '../lib/types';

function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function Financeiro() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'pagos'>('pendentes');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setLancamentos(await listarLancamentos());
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

  return (
    <>
      <Cabecalho titulo="Finanças — Fluxo & Lançamentos" subtitulo="Despesas de campo, entradas de sinal e conciliação rápida." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={ArrowUpCircle} rotulo="A receber" valor={formatarMoeda(aReceber)} legenda="Receitas pendentes" />
          <MetricCard Icone={ArrowDownCircle} rotulo="A pagar" valor={formatarMoeda(aPagar)} legenda="Despesas pendentes" />
          <MetricCard Icone={Wallet} rotulo="Receita paga no mês" valor={formatarMoeda(receitaMes)} legenda="Inclui sinal/saldo de contratos" />
          <MetricCard Icone={Scale} rotulo="Saldo do mês" valor={formatarMoeda(receitaMes - despesaMes)} legenda="Receita paga − despesa paga" />
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
                  <button key={f} type="button" onClick={() => setFiltro(f)} className={`rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${filtro === f ? 'bg-raised text-accent' : 'text-text-dim hover:text-text'}`}>
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
              {visiveis.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
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
      </Conteudo>
    </>
  );
}
