import { AlertTriangle, CheckCircle2, Clock, Plus, Search, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BarrasMensais } from '../components/BarrasMensais';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { Titulo } from '../components/Titulo';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { cancelarCobranca, criarCobranca, excluirCobranca, listarCobrancas, marcarCobrancaPaga, reabrirCobranca } from '../lib/api/cobrancas';
import { listarEmpresas } from '../lib/api/empresas';
import { formatarData, formatarMesAno, formatarMoeda } from '../lib/format';
import { ProgressBar } from '../components/ui/ProgressBar';
import { calcularMrr, dataLocal, diasDeAtraso, empresaPagante, mrrPorPlano, receitaPorMes, resumoCobrancas, statusCobranca, taxaInadimplencia, ultimosMeses, type StatusCobrancaExibido } from '../lib/metricas';
import { PLANO_ROTULO, STATUS_COBRANCA_INFO } from '../lib/rotulos';
import { useToast } from '../lib/toast';
import type { CobrancaComEmpresa, Empresa, PlanoEmpresa, TipoCobranca } from '../lib/types';

type Filtro = 'todas' | StatusCobrancaExibido;

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'pendente', rotulo: 'Pendentes' },
  { id: 'atrasada', rotulo: 'Atrasadas' },
  { id: 'pago', rotulo: 'Pagas' },
];

const TIPO_ROTULO: Record<TipoCobranca, string> = { mensalidade: 'Mensalidade', implantacao: 'Implantação', outro: 'Outro' };

export default function Financeiro() {
  const { sucesso, erro: erroToast } = useToast();
  const [cobrancas, setCobrancas] = useState<CobrancaComEmpresa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');

  const [novaAberta, setNovaAberta] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoCobranca>('mensalidade');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState(dataLocal());
  const [criando, setCriando] = useState(false);

  const hoje = dataLocal();

  function aoFalhar(e: unknown) {
    erroToast(e instanceof Error ? e.message : 'Algo deu errado.');
  }

  async function carregar() {
    setErro(null);
    try {
      const [cb, emp] = await Promise.all([listarCobrancas(), listarEmpresas()]);
      setCobrancas(cb);
      setEmpresas(emp);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar cobranças.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const meses = useMemo(() => ultimosMeses(6), []);
  const receita = useMemo(() => receitaPorMes(cobrancas, meses), [cobrancas, meses]);
  const resumo = resumoCobrancas(cobrancas, hoje);
  const mrr = calcularMrr(empresas);
  const porPlano = mrrPorPlano(empresas);
  const pagantes = empresas.filter(empresaPagante).length;
  const inadimplencia = taxaInadimplencia(cobrancas, hoje);
  const suspensas = empresas.filter((e) => e.status === 'suspensa').length;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return cobrancas.filter((c) => (filtro === 'todas' || statusCobranca(c, hoje) === filtro) && (!termo || (c.empresa?.nome ?? '').toLowerCase().includes(termo) || c.descricao.toLowerCase().includes(termo)));
  }, [cobrancas, filtro, busca, hoje]);

  function aoEscolherEmpresa(id: string) {
    setEmpresaId(id);
    const e = empresas.find((x) => x.id === id);
    if (!e) return;
    if (!valor && e.mrr > 0) setValor(String(e.mrr));
    if (!descricao) setDescricao(`Mensalidade ${formatarMesAno(hoje.slice(0, 7))}`);
  }

  async function aoCriar() {
    if (!empresaId || !descricao.trim() || !Number(valor)) return;
    setCriando(true);
    try {
      await criarCobranca({ empresa_id: empresaId, descricao: descricao.trim(), tipo, valor: Number(valor), vencimento });
      setNovaAberta(false);
      setEmpresaId('');
      setDescricao('');
      setTipo('mensalidade');
      setValor('');
      setVencimento(dataLocal());
      sucesso('Cobrança lançada.');
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriando(false);
    }
  }

  async function agir(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      sucesso(ok);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    }
  }

  const totalMrr = porPlano.essencial + porPlano.profissional + porPlano.enterprise;

  return (
    <>
      <Titulo
        titulo="Financeiro"
        subtitulo="Receitas, cobranças e MRR da plataforma."
        acao={
          <button type="button" onClick={() => setNovaAberta(true)} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nova cobrança
          </button>
        }
      />

      <MetricGrid colunas={4}>
        <MetricCard Icone={TrendingUp} rotulo="MRR" valor={formatarMoeda(mrr)} valorAnimado={{ alvo: mrr, formatar: formatarMoeda }} legenda={`${pagantes} empresa${pagantes !== 1 ? 's' : ''} pagante${pagantes !== 1 ? 's' : ''}`} />
        <MetricCard Icone={CheckCircle2} rotulo="Recebido no mês" valor={formatarMoeda(resumo.recebidoNoMes)} valorAnimado={{ alvo: resumo.recebidoNoMes, formatar: formatarMoeda }} legenda="Cobranças pagas neste mês" tom={resumo.recebidoNoMes > 0 ? 'sucesso' : undefined} />
        <MetricCard Icone={Clock} rotulo="A receber" valor={formatarMoeda(resumo.aReceber)} valorAnimado={{ alvo: resumo.aReceber, formatar: formatarMoeda }} legenda="Pendentes, ainda no prazo" />
        <MetricCard Icone={AlertTriangle} rotulo="Em atraso" valor={formatarMoeda(resumo.emAtraso)} valorAnimado={{ alvo: resumo.emAtraso, formatar: formatarMoeda }} vivo={resumo.emAtraso > 0 ? 'perigo' : undefined} legenda={`${resumo.qtdEmAtraso} cobrança${resumo.qtdEmAtraso !== 1 ? 's' : ''}`} tom={resumo.emAtraso > 0 ? 'perigo' : undefined} />
      </MetricGrid>

      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Panel revelar={0} className="min-w-0 lg:col-span-2">
          <PanelHeader titulo="Receita recebida" desc="Últimos 6 meses, pelo mês do pagamento." />
          {carregando ? <SkeletonLinhas n={3} /> : <BarrasMensais rotulos={meses.map(formatarMesAno)} valores={receita} formatar={formatarMoeda} />}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel revelar={70}>
            <PanelHeader titulo="MRR por plano" />
            {totalMrr === 0 ? (
              <p className="text-[12.5px] text-text-faint">Nenhuma empresa pagante ainda.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {(Object.keys(PLANO_ROTULO) as PlanoEmpresa[]).map((p) => (
                  <div key={p}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="text-text-dim">{PLANO_ROTULO[p]}</span>
                      <span className="font-mono text-text">
                        {formatarMoeda(porPlano[p])} <span className="text-[11px] text-text-faint">{Math.round((porPlano[p] / totalMrr) * 100)}%</span>
                      </span>
                    </div>
                    <ProgressBar valor={(porPlano[p] / totalMrr) * 100} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel revelar={140}>
            <PanelHeader titulo="Indicadores" />
            <dl className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-dim">Ticket médio</dt>
                <dd className="font-mono font-semibold text-text">{pagantes > 0 ? formatarMoeda(mrr / pagantes) : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-dim">Inadimplência</dt>
                <dd className={`font-mono font-semibold ${inadimplencia != null && inadimplencia > 0 ? 'text-danger' : 'text-text'}`}>{inadimplencia != null ? `${inadimplencia.toFixed(1)}%` : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-dim">Empresas suspensas</dt>
                <dd className="font-mono font-semibold text-text">{suspensas}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel revelar={0}>
        <PanelHeader
          titulo="Cobranças"
          desc={carregando ? undefined : `${visiveis.length} de ${cobrancas.length}`}
          acao={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" strokeWidth={2} />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="pl-8" />
              </div>
              <div className="inline-flex gap-0.5 rounded-md border border-line bg-input p-0.5">
                {FILTROS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFiltro(f.id)} className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filtro === f.id ? 'bg-raised text-accent-strong' : 'text-text-dim hover:text-text'}`}>
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {carregando ? (
          <SkeletonLinhas />
        ) : cobrancas.length === 0 ? (
          <EstadoVazio Icone={CheckCircle2} titulo="Nenhuma cobrança lançada ainda" descricao='Clique em "Nova cobrança" pra lançar a primeira mensalidade.' />
        ) : visiveis.length === 0 ? (
          <EstadoVazio Icone={Search} titulo="Nenhuma cobrança encontrada" />
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[860px] flex-col gap-2">
              <div className="grid grid-cols-[1fr_1.3fr_1.6fr_1fr_1fr_1.6fr] gap-3 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
                <span>Vencimento</span>
                <span>Empresa</span>
                <span>Descrição</span>
                <span>Valor</span>
                <span>Status</span>
                <span className="text-right">Ações</span>
              </div>
              {visiveis.map((c) => {
                const st = statusCobranca(c, hoje);
                return (
                  <div key={c.id} className="grid grid-cols-[1fr_1.3fr_1.6fr_1fr_1fr_1.6fr] items-center gap-3 rounded-md border border-line bg-input px-3 py-2.5 text-[12.5px]">
                    <span className="text-text-dim">
                      {formatarData(c.vencimento)}
                      {st === 'atrasada' && <span className="block text-[10.5px] text-danger">há {diasDeAtraso(c.vencimento, hoje)}d</span>}
                    </span>
                    <span className="truncate font-medium text-text">{c.empresa?.nome ?? '—'}</span>
                    <span className="min-w-0 truncate text-text-dim">
                      {c.descricao} <span className="text-text-faint">· {TIPO_ROTULO[c.tipo]}</span>
                    </span>
                    <span className="font-mono text-text">{formatarMoeda(c.valor)}</span>
                    <span>
                      <Badge tom={STATUS_COBRANCA_INFO[st].tom} texto={STATUS_COBRANCA_INFO[st].rotulo} />
                      {c.pago_em && <span className="mt-0.5 block text-[10.5px] text-text-faint">em {formatarData(c.pago_em)}</span>}
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-2 text-[11.5px]">
                      {(st === 'pendente' || st === 'atrasada') && (
                        <button type="button" onClick={() => agir(() => marcarCobrancaPaga(c.id, c.empresa_id, dataLocal()), 'Cobrança baixada como paga.')} className="rounded-md bg-success/15 px-2.5 py-1 font-semibold text-success hover:bg-success/25">
                          Marcar paga
                        </button>
                      )}
                      {st === 'pago' && (
                        <button type="button" onClick={() => agir(() => reabrirCobranca(c.id), 'Cobrança reaberta.')} className="text-text-dim hover:text-text hover:underline">
                          Reabrir
                        </button>
                      )}
                      {(st === 'pendente' || st === 'atrasada') && (
                        <button type="button" onClick={() => agir(() => cancelarCobranca(c.id), 'Cobrança cancelada.')} className="text-text-dim hover:text-text hover:underline">
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => window.confirm('Excluir esta cobrança de vez?') && agir(() => excluirCobranca(c.id), 'Cobrança excluída.')}
                        className="text-text-faint hover:text-danger hover:underline"
                      >
                        Excluir
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      {novaAberta && (
        <Drawer titulo="Nova cobrança" onFechar={() => setNovaAberta(false)}>
          <div className="flex flex-col gap-4">
            <Select rotulo="Empresa" value={empresaId} onChange={(e) => aoEscolherEmpresa(e.target.value)}>
              <option value="">Selecione…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
            <Input rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Mensalidade Set/26" />
            <div className="grid grid-cols-2 gap-3">
              <Select rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCobranca)}>
                {(Object.keys(TIPO_ROTULO) as TipoCobranca[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_ROTULO[t]}
                  </option>
                ))}
              </Select>
              <Input rotulo="Valor (R$)" type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <Input rotulo="Vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            <p className="text-[11.5px] text-text-faint">Sem gateway de pagamento: a cobrança é lançada e baixada à mão aqui.</p>
            <button type="button" disabled={criando || !empresaId || !descricao.trim() || !Number(valor) || !vencimento} onClick={aoCriar} className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              {criando ? 'Lançando…' : 'Lançar cobrança'}
            </button>
          </div>
        </Drawer>
      )}
    </>
  );
}
