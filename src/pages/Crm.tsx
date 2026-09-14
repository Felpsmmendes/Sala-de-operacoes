import { CheckCircle2, Filter, MessageCircle, Snowflake, UserPlus, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { aplicarAutomacoesEvento } from '../lib/api/automacoes';
import { atualizarLead, buscarUltimoContatoPorLead, criarLead, excluirLead, listarLeads, obterLead } from '../lib/api/leads';
import { atualizarFunil, criarFunil, excluirFunil, listarFunis, reordenarFunis } from '../lib/api/funis';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader, Segmented } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { AutomacoesCrm } from '../components/crm/AutomacoesCrm';
import { Conversas } from '../components/crm/Conversas';
import { DetalheLead } from '../components/crm/DetalheLead';
import { LeadForm } from '../components/crm/LeadForm';
import { PipelineLeads } from '../components/crm/PipelineLeads';
import { TabelaLeads } from '../components/crm/TabelaLeads';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import { corFunilPorIndice, formatarMoeda } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { FunilLead, Lead, StatusLead } from '../lib/types';

type Aba = 'leads' | 'conversas' | 'novo' | 'automacoes';
const ABAS: { id: Aba; rotulo: string; Icone: typeof Users }[] = [
  { id: 'leads', rotulo: 'Leads', Icone: Users },
  { id: 'conversas', rotulo: 'Conversas', Icone: MessageCircle },
  { id: 'novo', rotulo: 'Adicionar Lead', Icone: UserPlus },
  { id: 'automacoes', rotulo: 'Automações', Icone: Zap },
];

/** Reporta o resultado de `aplicarAutomacoesEvento` (Fase D+, 2026-09-11)
    sem travar a ação principal — se nenhuma automação aplicável existir,
    fica em silêncio; se alguma falhou (ex.: WhatsApp ainda sem
    credencial), avisa qual e por quê, mas o lead já foi criado/movido
    de qualquer jeito. */
function avisarResultadoAutomacoes(resultado: { aplicadas: string[]; falhas: { nome: string; motivo: string }[] }) {
  if (resultado.falhas.length === 0) return;
  toast.aviso(`Automação(ões) com problema:\n${resultado.falhas.map((f) => `• ${f.nome}: ${f.motivo}`).join('\n')}`);
}

export default function Crm() {
  const [aba, setAba] = useState<Aba>('leads');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [todosLeads, setTodosLeads] = useState<Lead[]>([]);
  const [funis, setFunis] = useState<FunilLead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusLead | ''>('');
  const [ultimoContatoPorLead, setUltimoContatoPorLead] = useState<Map<string, string>>(new Map());

  const [modo, setModo] = useState<'pipeline' | 'tabela'>('pipeline');
  const [novoErro, setNovoErro] = useState<string | null>(null);
  const [novoSalvando, setNovoSalvando] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [leadDetalhe, setLeadDetalhe] = useState<Lead | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);
  const [detalheSalvando, setDetalheSalvando] = useState(false);

  const confirmar = useConfirmDialog();

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLista(null);
    try {
      const [filtrados, todos, listaFunis] = await Promise.all([listarLeads({ busca, status: filtroStatus }), listarLeads(), listarFunis()]);
      setLeads(filtrados);
      setTodosLeads(todos);
      setFunis(listaFunis);
      // "leads esfriando" (Fase D do roadmap, 2026-09-11) precisa da data
      // de contato mais recente de cada lead — busca em lote (1 consulta,
      // nunca 1 por lead) depois de saber quem são todos os leads.
      setUltimoContatoPorLead(await buscarUltimoContatoPorLead(todos.map((l) => l.id)));
    } catch (e) {
      setErroLista(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroStatus]);

  useEffect(() => {
    const atraso = setTimeout(carregar, busca ? 250 : 0);
    return () => clearTimeout(atraso);
  }, [carregar]);

  useEffect(() => {
    setDetalheErro(null);
    if (!selecionadoId) return setLeadDetalhe(null);
    obterLead(selecionadoId)
      .then(setLeadDetalhe)
      .catch((e) => setDetalheErro(mensagemDeErro(e)));
  }, [selecionadoId]);

  async function aoCriar(dados: Parameters<typeof criarLead>[0]) {
    setNovoSalvando(true);
    setNovoErro(null);
    try {
      const lead = await criarLead(dados);
      setFormKey((k) => k + 1);
      carregar();
      aplicarAutomacoesEvento('lead_criado', lead).then(avisarResultadoAutomacoes).catch((e) => toast.erro(mensagemDeErro(e)));
    } catch (e) {
      setNovoErro(mensagemDeErro(e));
    } finally {
      setNovoSalvando(false);
    }
  }

  async function aoSalvarEdicao(dados: Parameters<typeof atualizarLead>[1]) {
    if (!selecionadoId) return;
    setDetalheSalvando(true);
    setDetalheErro(null);
    try {
      setLeadDetalhe(await atualizarLead(selecionadoId, dados));
      carregar();
    } catch (e) {
      setDetalheErro(mensagemDeErro(e));
    } finally {
      setDetalheSalvando(false);
    }
  }

  async function aoExcluir() {
    if (!selecionadoId || !leadDetalhe) return;
    if (!(await confirmar.pedir({ titulo: 'Excluir lead', mensagem: `Excluir "${leadDetalhe.nome}"? O histórico de conversa dele também é apagado.`, textoConfirmar: 'Excluir', perigo: true }))) return;
    await excluirLead(selecionadoId);
    setSelecionadoId(null);
    carregar();
  }

  /** Arrastar um lead pra outra coluna no Kanban — só muda o status. Também
      chamada pelo select "Mover para" em DetalheLead.tsx — é a única via
      alternativa ao arrastar pra mudar o funil de um lead (achado da
      auditoria de UX: sem isso não havia jeito nenhum de fazer isso sem
      mouse). */
  async function aoMoverLead(leadId: string, funilId: string) {
    const lead = leads.find((l) => l.id === leadId) ?? todosLeads.find((l) => l.id === leadId);
    if (!lead || lead.status === funilId) return;
    // otimista: já reflete na tela, sem esperar a rede.
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: funilId } : l)));
    setTodosLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: funilId } : l)));
    if (leadDetalhe?.id === leadId) setLeadDetalhe((prev) => (prev ? { ...prev, status: funilId } : prev));
    try {
      await atualizarLead(leadId, { status: funilId });
      aplicarAutomacoesEvento('mudanca_funil', { ...lead, status: funilId }, { funilNovoId: funilId }).then(avisarResultadoAutomacoes).catch((e) => toast.erro(mensagemDeErro(e)));
    } catch (e) {
      toast.erro(mensagemDeErro(e));
      carregar();
    }
  }

  async function aoReordenarFunis(idsNaOrdem: string[]) {
    setFunis((prev) => idsNaOrdem.map((id, ordem) => ({ ...(prev.find((f) => f.id === id) as FunilLead), ordem })));
    try {
      await reordenarFunis(idsNaOrdem);
    } catch (e) {
      toast.erro(mensagemDeErro(e));
      carregar();
    }
  }

  async function aoCriarFunil(nome: string, cor: FunilLead['cor']) {
    await criarFunil(nome, cor);
    carregar();
  }

  async function aoRenomearFunil(id: string, dados: { nome?: string; cor?: FunilLead['cor'] }) {
    await atualizarFunil(id, dados);
    carregar();
  }

  async function aoExcluirFunil(id: string) {
    await excluirFunil(id);
    carregar();
  }

  const funisPorId = new Map(funis.map((f) => [f.id, f]));
  const emNegociacao = leads.filter((l) => funisPorId.get(l.status)?.papel == null).length;
  const ganhos = leads.filter((l) => funisPorId.get(l.status)?.papel === 'ganho').length;
  const perdidos = leads.filter((l) => funisPorId.get(l.status)?.papel === 'perdido').length;

  // "Leads esfriando" (Fase D do roadmap, 2026-09-11) — só considera quem
  // ainda está em negociação (papel null: ganho/perdido já são casos
  // encerrados, não "esfriam"), a partir de TODOS os leads (nunca da
  // busca/filtro atual — risco comercial não pode ficar escondido atrás
  // de um filtro esquecido ligado). 7 dias sem contato é o limiar; ordena
  // pelos mais valiosos primeiro, depois pelos mais frios.
  const DIAS_SEM_CONTATO_LIMITE = 7;
  const leadsEsfriando = useMemo(() => {
    const hoje = Date.now();
    return todosLeads
      .filter((l) => funisPorId.get(l.status)?.papel == null)
      .map((l) => {
        const ultimoContato = ultimoContatoPorLead.get(l.id) ?? l.criado_em;
        const dias = Math.floor((hoje - new Date(ultimoContato).getTime()) / 86_400_000);
        return { lead: l, dias };
      })
      .filter((x) => x.dias >= DIAS_SEM_CONTATO_LIMITE)
      .sort((a, b) => (b.lead.valor_estimado ?? 0) - (a.lead.valor_estimado ?? 0) || b.dias - a.dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosLeads, funis, ultimoContatoPorLead]);

  return (
    <>
      <Cabecalho titulo="CRM & Pipeline de Leads" subtitulo="Novo lead → degustação agendada → proposta enviada → contrato fechado." />
      <Conteudo>
        {/* submenu horizontal, sempre visível — nunca um menu que abre/fecha */}
        <div className="mb-5 flex gap-1 border-b border-line">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                aba === item.id ? 'border-people text-people' : 'border-transparent text-text-dim hover:text-text'
              }`}
            >
              <item.Icone className="h-4 w-4" strokeWidth={2} />
              {item.rotulo}
            </button>
          ))}
        </div>

        {aba === 'leads' && (
          <>
            <MetricGrid>
              <MetricCard Icone={Users} rotulo="Total de leads" valor={String(leads.length)} legenda="Nesta busca/filtro" categoria="pessoas" />
              <MetricCard Icone={Filter} rotulo="Em negociação" valor={String(emNegociacao)} legenda="Nos funis do meio" categoria="pessoas" />
              <MetricCard Icone={CheckCircle2} rotulo="Ganhos" valor={String(ganhos)} legenda="Virou contrato" categoria="pessoas" />
              <MetricCard Icone={Users} rotulo="Perdidos" valor={String(perdidos)} legenda="Fora do funil" categoria="pessoas" />
              <MetricCard
                Icone={Snowflake}
                rotulo="Leads esfriando"
                valor={String(leadsEsfriando.length)}
                legenda={`${DIAS_SEM_CONTATO_LIMITE}+ dias sem contato`}
                categoria={leadsEsfriando.length > 0 ? 'pessoas' : 'neutro'}
              />
            </MetricGrid>

            {leadsEsfriando.length > 0 && (
              <Panel className="mb-4">
                <PanelHeader titulo="Leads esfriando" desc={`Em negociação, sem contato há ${DIAS_SEM_CONTATO_LIMITE}+ dias — ordenado pelos mais valiosos primeiro.`} />
                <div className="flex flex-col gap-2">
                  {leadsEsfriando.slice(0, 8).map(({ lead, dias }) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => {
                        setAba('leads');
                        setSelecionadoId(lead.id);
                      }}
                      className="list-row flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-left text-sm"
                    >
                      <div className="min-w-0">
                        <strong className="text-text">{lead.nome}</strong>
                        <span className="ml-2 text-[11.5px] text-text-faint">{funisPorId.get(lead.status)?.nome ?? lead.status}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3 text-[11.5px]">
                        <span className="font-mono text-pending">{dias}d sem contato</span>
                        {lead.valor_estimado != null && <span className="font-mono text-text-dim">{formatarMoeda(lead.valor_estimado)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {funis.length > 0 && leads.length > 0 && (
              <Panel className="mb-4">
                <PanelHeader titulo="Leads por funil" desc="Quantos leads estão em cada coluna do Pipeline, nesta busca/filtro." />
                <GraficoDonut
                  centroRotulo="Leads"
                  fatias={funis.map((f, i) => ({ rotulo: f.nome, valor: leads.filter((l) => l.status === f.id).length, corClasse: corFunilPorIndice(i) }))}
                  formatarValor={(v) => `${v} lead${v === 1 ? '' : 's'}`}
                />
              </Panel>
            )}

            <Panel>
              <PanelHeader
                titulo="Leads"
                desc="Busque, filtre e acompanhe o status de cada lead."
                acao={<Segmented valor={modo} onMudar={setModo} opcoes={[{ valor: 'pipeline', rotulo: 'Pipeline' }, { valor: 'tabela', rotulo: 'Tabela' }]} corAtiva="text-people" />}
              />

              <div className="mb-4 flex flex-wrap gap-3 rounded-md border border-line bg-raised p-3">
                <div className="min-w-[180px] flex-1">
                  <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, telefone ou e-mail" categoria="pessoas" />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} categoria="pessoas">
                    <option value="">Todos os status</option>
                    {funis.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {carregando && <p className="text-sm text-text-dim">Carregando leads…</p>}
              {erroLista && !carregando && <p className="rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erroLista}</p>}

              {!carregando && !erroLista && (
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="min-w-0">
                    {modo === 'pipeline' ? (
                      <PipelineLeads
                        leads={leads}
                        funis={funis}
                        selecionadoId={selecionadoId}
                        onSelecionar={(id) => setSelecionadoId(id === selecionadoId ? null : id)}
                        onMoverLead={aoMoverLead}
                        onReordenarFunis={aoReordenarFunis}
                        onCriarFunil={aoCriarFunil}
                        onRenomearFunil={aoRenomearFunil}
                        onExcluirFunil={aoExcluirFunil}
                      />
                    ) : (
                      <TabelaLeads leads={leads} funis={funis} selecionadoId={selecionadoId} onSelecionar={(id) => setSelecionadoId(id === selecionadoId ? null : id)} />
                    )}
                  </div>
                  <div className="rounded-md border border-line bg-raised p-4">
                    {leadDetalhe && leadDetalhe.id !== selecionadoId ? (
                      <SkeletonLinhas />
                    ) : (
                      <DetalheLead
                        lead={leadDetalhe}
                        funis={funis}
                        onSalvar={aoSalvarEdicao}
                        onExcluir={aoExcluir}
                        onMudarFunil={(funilId) => leadDetalhe && aoMoverLead(leadDetalhe.id, funilId)}
                        salvando={detalheSalvando}
                        erro={detalheErro}
                      />
                    )}
                  </div>
                </div>
              )}
            </Panel>
          </>
        )}

        {aba === 'conversas' && <Conversas leads={todosLeads} funis={funis} />}

        {aba === 'novo' && (
          <Panel>
            <PanelHeader titulo="Adicionar lead" desc="Cadastre um novo lead ou cliente em potencial." />
            <LeadForm key={formKey} valoresIniciais={{}} funis={funis} salvando={novoSalvando} erro={novoErro} onSalvar={aoCriar} />
          </Panel>
        )}

        {aba === 'automacoes' && (
          <Panel>
            <PanelHeader
              titulo="Automações"
              desc="Regras “se X então Y” que rodam sozinhas — sem contato move de funil, lead novo já dispara uma ação, ou entra num funil e algo acontece."
            />
            <AutomacoesCrm funis={funis} />
          </Panel>
        )}
      </Conteudo>
      {confirmar.dialogo}
    </>
  );
}
