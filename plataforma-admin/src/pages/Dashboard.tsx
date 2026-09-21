import { AlertTriangle, Building2, CalendarClock, ExternalLink, TrendingUp, UserPlus, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarrasMensais } from '../components/BarrasMensais';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { Titulo } from '../components/Titulo';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { listarChamados } from '../lib/api/chamados';
import { listarCobrancas } from '../lib/api/cobrancas';
import { listarEmpresas } from '../lib/api/empresas';
import { listarLeadsPlataforma } from '../lib/api/leadsPlataforma';
import { useAuth } from '../lib/AuthContext';
import { formatarMesAno, formatarMoeda, saudacao } from '../lib/format';
import { calcularMrr, dataLocal, diasDeAtraso, empresaPagante, funilPlataforma, leadsEmAberto, receitaPorMes, resumoChamados, statusCobranca, ultimosMeses } from '../lib/metricas';
import { PLANO_ROTULO, STATUS_EMPRESA_INFO } from '../lib/rotulos';
import type { ChamadoComEmpresa, CobrancaComEmpresa, Empresa, LeadPlataforma } from '../lib/types';

type Acao = { chave: string; titulo: string; detalhe: string; quando: string; tom: 'perigo' | 'pendente'; to: string; peso: number };

function montarAcoes(cobrancas: CobrancaComEmpresa[], chamados: ChamadoComEmpresa[], hoje: string): Acao[] {
  const acoes: Acao[] = [];
  const limite = new Date(`${hoje}T00:00:00`);
  limite.setDate(limite.getDate() + 7);
  const ate7dias = dataLocal(limite);

  for (const c of cobrancas) {
    const st = statusCobranca(c, hoje);
    const quem = c.empresa?.nome ?? 'Empresa';
    if (st === 'atrasada') {
      const d = diasDeAtraso(c.vencimento, hoje);
      acoes.push({ chave: `c-${c.id}`, titulo: `Cobrar ${quem}`, detalhe: `${c.descricao} · ${formatarMoeda(c.valor)}`, quando: `atrasada há ${d}d`, tom: 'perigo', to: '/financeiro', peso: 0 });
    } else if (st === 'pendente' && c.vencimento <= ate7dias) {
      const d = Math.round((new Date(`${c.vencimento}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86_400_000);
      acoes.push({ chave: `c-${c.id}`, titulo: `Cobrança de ${quem}`, detalhe: `${c.descricao} · ${formatarMoeda(c.valor)}`, quando: d === 0 ? 'vence hoje' : `vence em ${d}d`, tom: 'pendente', to: '/financeiro', peso: 2 });
    }
  }
  for (const ch of chamados) {
    if (ch.status === 'resolvido') continue;
    if (ch.prioridade === 'urgente') acoes.push({ chave: `h-${ch.id}`, titulo: ch.titulo, detalhe: ch.empresa?.nome ?? 'Empresa', quando: 'urgente', tom: 'perigo', to: '/manutencoes', peso: 1 });
    else if (ch.prioridade === 'alta') acoes.push({ chave: `h-${ch.id}`, titulo: ch.titulo, detalhe: ch.empresa?.nome ?? 'Empresa', quando: 'prioridade alta', tom: 'pendente', to: '/manutencoes', peso: 3 });
  }
  return acoes.sort((a, b) => a.peso - b.peso).slice(0, 6);
}

export default function Dashboard() {
  const { session } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [leads, setLeads] = useState<LeadPlataforma[]>([]);
  const [chamados, setChamados] = useState<ChamadoComEmpresa[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaComEmpresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarEmpresas(), listarLeadsPlataforma(), listarChamados(), listarCobrancas()])
      .then(([e, l, ch, cb]) => {
        setEmpresas(e);
        setLeads(l);
        setChamados(ch);
        setCobrancas(cb);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar o painel.'))
      .finally(() => setCarregando(false));
  }, []);

  const hoje = dataLocal();
  const meses = useMemo(() => ultimosMeses(6), []);
  const receita = useMemo(() => receitaPorMes(cobrancas, meses), [cobrancas, meses]);
  const funil = useMemo(() => funilPlataforma(leads), [leads]);
  const maiorFunil = Math.max(...funil.map((f) => f.qtd), 1);
  const acoes = useMemo(() => montarAcoes(cobrancas, chamados, hoje), [cobrancas, chamados, hoje]);
  const cham = resumoChamados(chamados);
  const sistemas = useMemo(() => empresas.filter(empresaPagante).sort((a, b) => b.mrr - a.mrr).slice(0, 4), [empresas]);

  const meta = session?.user?.user_metadata as { nome?: string } | undefined;
  const nome = (meta?.nome || session?.user?.email?.split('@')[0] || '').split(' ')[0];
  const ativas = empresas.filter((e) => e.status === 'ativa').length;
  const emTrial = empresas.filter((e) => e.status === 'trial').length;

  return (
    <>
      <Titulo titulo={`${saudacao()}${nome ? `, ${nome}` : ''}!`} subtitulo="Aqui está o resumo da plataforma hoje." />
      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <MetricGrid colunas={5}>
        <MetricCard Icone={TrendingUp} rotulo="MRR" valor={formatarMoeda(calcularMrr(empresas))} legenda="Ativas e em manutenção" />
        <MetricCard Icone={Building2} rotulo="Clientes ativos" valor={String(ativas)} legenda={`de ${empresas.length} cadastrada${empresas.length !== 1 ? 's' : ''}`} />
        <MetricCard Icone={UserPlus} rotulo="Leads" valor={String(leadsEmAberto(leads))} legenda="No funil de vendas" />
        <MetricCard Icone={CalendarClock} rotulo="Em trial" valor={String(emTrial)} legenda="Ainda não pagam" />
        <MetricCard Icone={Wrench} rotulo="Manutenções abertas" valor={String(cham.abertos)} legenda={cham.urgentes > 0 ? `${cham.urgentes} urgente${cham.urgentes !== 1 ? 's' : ''}` : 'Nenhuma urgente'} tom={cham.urgentes > 0 ? 'perigo' : undefined} />
      </MetricGrid>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelHeader titulo="Receita dos últimos 6 meses" desc="Cobranças pagas, pelo mês do pagamento." />
            {carregando ? (
              <SkeletonLinhas n={3} />
            ) : receita.every((v) => v === 0) ? (
              <p className="py-6 text-center text-[12.5px] text-text-faint">
                Nenhuma cobrança paga ainda. Lance e baixe cobranças em{' '}
                <Link to="/financeiro" className="text-accent-strong hover:underline">
                  Financeiro
                </Link>
                .
              </p>
            ) : (
              <BarrasMensais rotulos={meses.map(formatarMesAno)} valores={receita} formatar={formatarMoeda} />
            )}
          </Panel>

          <Panel>
            <PanelHeader
              titulo="Acessar sistemas"
              desc="As empresas que mais faturam — abre o sistema de cada uma."
              acao={
                <Link to="/empresas" className="text-[12px] text-accent-strong hover:underline">
                  Ver todas
                </Link>
              }
            />
            {carregando ? (
              <SkeletonLinhas n={3} />
            ) : sistemas.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-text-faint">Nenhuma empresa ativa ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sistemas.map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-input px-3 py-2.5">
                    <Avatar nome={e.nome} tamanho={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text">{e.nome}</p>
                      <p className="text-[11.5px] text-text-faint">
                        {PLANO_ROTULO[e.plano]} · {formatarMoeda(e.mrr)}/mês
                      </p>
                    </div>
                    <Badge tom={STATUS_EMPRESA_INFO[e.status].tom} texto={STATUS_EMPRESA_INFO[e.status].rotulo} />
                    {e.url_sistema ? (
                      <a href={e.url_sistema} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink hover:bg-accent-strong">
                        Acessar <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
                      </a>
                    ) : (
                      <Link to="/empresas" className="text-[11.5px] text-text-faint hover:text-text-dim hover:underline" title="Cadastre o endereço do sistema desta empresa">
                        Sem link
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelHeader
              titulo="Pipeline de vendas"
              desc="Prospecção em aberto, por etapa."
              acao={
                <Link to="/crm" className="text-[12px] text-accent-strong hover:underline">
                  Abrir CRM
                </Link>
              }
            />
            {carregando ? (
              <SkeletonLinhas n={5} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {funil.map((f) => (
                  <div key={f.id}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="text-text-dim">{f.rotulo}</span>
                      <span className="font-mono text-text">
                        {f.qtd}
                        {f.valor > 0 && <span className="ml-2 text-[11px] text-text-faint">{formatarMoeda(f.valor)}</span>}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-raised">
                      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(f.qtd / maiorFunil) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader titulo="Próximas ações" desc="Cobranças e chamados que pedem atenção." />
            {carregando ? (
              <SkeletonLinhas n={3} />
            ) : acoes.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-success">Nada pendente — tudo em dia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {acoes.map((a) => (
                  <Link key={a.chave} to={a.to} className="flex items-center gap-3 rounded-md border border-line bg-input px-3 py-2.5 hover:bg-raised">
                    <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${a.tom === 'perigo' ? 'text-danger' : 'text-pending'}`} strokeWidth={2} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-text">{a.titulo}</span>
                      <span className="block truncate text-[11.5px] text-text-faint">{a.detalhe}</span>
                    </span>
                    <span className={`flex-shrink-0 font-mono text-[10.5px] uppercase ${a.tom === 'perigo' ? 'text-danger' : 'text-pending'}`}>{a.quando}</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
