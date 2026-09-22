import { CheckCircle2, Filter, MessageCircle, Smartphone, Snowflake, TrendingUp, UserPlus, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { aplicarAutomacoesEvento } from '../lib/api/automacoes';
import { atualizarLead, buscarUltimoContatoPorLead, criarLead, excluirLead, listarLeads, obterLead } from '../lib/api/leads';
import { atualizarFunil, criarFunil, excluirFunil, listarFunis, reordenarFunis } from '../lib/api/funis';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader, Segmented } from '../components/Panel';
import { SkeletonLinhas } from '../components/Skeleton';
import { AutomacoesCrm } from '../components/crm/AutomacoesCrm';
import { ConectarWhatsapp } from '../components/crm/ConectarWhatsapp';
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

type Aba = 'leads' | 'conversas' | 'novo' | 'automacoes' | 'whatsapp';
const ABAS: { id: Aba; rotulo: string; Icone: typeof Users }[] = [
  { id: 'leads', rotulo: 'Leads', Icone: Users },
  { id: 'conversas', rotulo: 'Conversas', Icone: MessageCircle },
  { id: 'novo', rotulo: 'Adicionar Lead', Icone: UserPlus },
  { id: 'automacoes', rotulo: 'Automações', Icone: Zap },
  { id: 'whatsapp', rotulo: 'Conectar WhatsApp', Icone: Smartphone },
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
  const [filtroValor, setFiltroValor] = useState<'' | 'ate5k' | '5k15k' | 'acima15k'>('');
  const [filtroOrigem, setFiltroOrigem] = useState('');
  const [filtroUltimoContato, setFiltroUltimoContato] = useState<'' | 'ate3d' | '4a7d' | '8a14d' | '15d'>('');
  const [ultimoContatoPorLead, setUltimoContatoPorLead] = useState<Map<string, string>>(new Map());

  const [modo, setModo] = useState<'pipeline' | 'tabela'>('pipeline');
  const [novoErro, setNovoErro] = useState<string | null>(null);
  const [novoSalvando, setNovoSalvando] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [searchParams] = useSearchParams();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [leadDetalhe, setLeadDetalhe] = useState<Lead | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);
  const [detalheSalvando, setDetalheSalvando] = useState(false);

  const confirmar = useConfirmDialog();

  // link direto pra um lead específico (ex.: "Ver lead" do orçamento
  // salvo, 2026-09-14) — mesmo padrão de `?evento=` já usado em Escala/
  // Auditoria/Roteiro. Só uma vez no mount; obterLead(id) abaixo já trata
  // um id inválido/apagado como erro amigável, sem travar a tela.
  useEffect(() => {
    const doLink = searchParams.get('lead');
    if (doLink) setSelecionadoId(doLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const funilAnterior = lead.status;
    // otimista: já reflete na tela, sem esperar a rede.
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: funilId } : l)));
    setTodosLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: funilId } : l)));
    if (leadDetalhe?.id === leadId) setLeadDetalhe((prev) => (prev ? { ...prev, status: funilId } : prev));
    try {
      await atualizarLead(leadId, { status: funilId });
      aplicarAutomacoesEvento('mudanca_funil', { ...lead, status: funilId }, { funilNovoId: funilId }).then(avisarResultadoAutomacoes).catch((e) => toast.erro(mensagemDeErro(e)));
      const nomeFunil = funis.find((f) => f.id === funilId)?.nome ?? funilId;
      // "Desfazer" move de volta pro funil anterior — dispara `aoMoverLead`
      // de novo, então roda automação de novo também (mesmo efeito de
      // arrastar na mão pra lá e de volta; não é um caso novo).
      toast.sucesso(`Lead movido para ${nomeFunil}.`, { rotulo: 'Desfazer', callback: () => aoMoverLead(leadId, funilAnterior) });
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

  // Origens distintas presentes nos dados (2026-09-19, REVIEW_DECISOES_V2
  // Parte 6/03 — "origem" como filtro) — `origem` é texto livre no
  // cadastro (LeadForm), então o filtro lista só o que já existe, nunca
  // uma lista fixa inventada.
  const origensDisponiveis = useMemo(() => [...new Set(todosLeads.map((l) => l.origem).filter((o): o is string => !!o))].sort(), [todosLeads]);

  // Filtro de valor estimado + origem + último contato (2026-09-17/19,
  // "P2/P3" + REVIEW_DECISOES_V2) — tudo em cima do que já veio filtrado
  // do servidor por busca/status; nunca refaz a consulta.
  const leadsFiltrados = useMemo(() => {
    return leads.filter((l) => {
      const v = l.valor_estimado ?? 0;
      if (filtroValor === 'ate5k' && v > 5000) return false;
      if (filtroValor === '5k15k' && (v <= 5000 || v > 15000)) return false;
      if (filtroValor === 'acima15k' && v <= 15000) return false;
      if (filtroOrigem && l.origem !== filtroOrigem) return false;
      if (filtroUltimoContato) {
        const ultimoContato = ultimoContatoPorLead.get(l.id) ?? l.criado_em;
        const dias = Math.floor((Date.now() - new Date(ultimoContato).getTime()) / 86_400_000);
        if (filtroUltimoContato === 'ate3d' && dias > 3) return false;
        if (filtroUltimoContato === '4a7d' && (dias < 4 || dias > 7)) return false;
        if (filtroUltimoContato === '8a14d' && (dias < 8 || dias > 14)) return false;
        if (filtroUltimoContato === '15d' && dias < 15) return false;
      }
      return true;
    });
  }, [leads, filtroValor, filtroOrigem, filtroUltimoContato, ultimoContatoPorLead]);

  const leadsEmNegociacao = leadsFiltrados.filter((l) => funisPorId.get(l.status)?.papel == null);
  const leadsGanhos = leadsFiltrados.filter((l) => funisPorId.get(l.status)?.papel === 'ganho');
  const emNegociacao = leadsEmNegociacao.length;
  const ganhos = leadsGanhos.length;
  const perdidos = leadsFiltrados.filter((l) => funisPorId.get(l.status)?.papel === 'perdido').length;
  const taxaConversao = leadsFiltrados.length > 0 ? Math.round((ganhos / leadsFiltrados.length) * 100) : 0;
  // MetricCards com quantidade + valor (REVIEW_DECISOES_V2, Parte 6/03).
  const valorEmNegociacao = leadsEmNegociacao.reduce((s, l) => s + (l.valor_estimado ?? 0), 0);
  const valorGanhos = leadsGanhos.reduce((s, l) => s + (l.valor_estimado ?? 0), 0);

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
        <div className="scrollbar-none mb-5 flex gap-1 overflow-x-auto border-b border-line">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
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
            <MetricGrid colunas={3}>
              <MetricCard Icone={Users} rotulo="Total de leads" valor={String(leadsFiltrados.length)} legenda="Nesta busca/filtro" categoria="pessoas" />
              <MetricCard Icone={Filter} rotulo="Em negociação" valor={String(emNegociacao)} legenda={`Nos funis do meio · ${formatarMoeda(valorEmNegociacao)}`} categoria="pessoas" />
              <MetricCard Icone={CheckCircle2} rotulo="Ganhos" valor={String(ganhos)} legenda={`Virou contrato · ${formatarMoeda(valorGanhos)}`} categoria="pessoas" />
              <MetricCard Icone={Users} rotulo="Perdidos" valor={String(perdidos)} legenda="Fora do funil" categoria="pessoas" />
              <MetricCard Icone={TrendingUp} rotulo="Taxa de conversão" valor={`${taxaConversao}%`} legenda="Ganhos / total nesta busca" categoria="pessoas" />
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
                  {leadsEsfriando.slice(0, 8).map(({ lead, dias }) => {
                    // Cor por tempo (REVIEW_DECISOES_V2, Parte 6/03) — só
                    // 8-14d/15d+ aparecem de fato aqui (a lista já é
                    // filtrada em 7+ dias), mesma escala do card Kanban.
                    const corDias = dias >= 8 ? 'text-danger' : 'text-pending';
                    const pesoDias = dias >= 15 ? 'font-bold' : 'font-semibold';
                    return (
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
                          <span className={`font-mono ${pesoDias} ${corDias}`}>{dias}d sem contato</span>
                          {lead.valor_estimado != null && <span className="font-mono text-text-dim">{formatarMoeda(lead.valor_estimado)}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            )}

            {funis.length > 0 && leadsFiltrados.length > 0 && (
              <Panel className="mb-4">
                <PanelHeader titulo="Leads por funil" desc="Quantos leads estão em cada coluna do Pipeline, nesta busca/filtro." />
                <GraficoDonut
                  centroRotulo="Leads"
                  fatias={funis.map((f, i) => ({ rotulo: f.nome, valor: leadsFiltrados.filter((l) => l.status === f.id).length, corClasse: corFunilPorIndice(i) }))}
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
                <div className="w-full sm:w-48">
                  <Select value={filtroValor} onChange={(e) => setFiltroValor(e.target.value as typeof filtroValor)} categoria="pessoas">
                    <option value="">Qualquer valor</option>
                    <option value="ate5k">Até R$5.000</option>
                    <option value="5k15k">R$5.000 – R$15.000</option>
                    <option value="acima15k">Acima de R$15.000</option>
                  </Select>
                </div>
                {origensDisponiveis.length > 0 && (
                  <div className="w-full sm:w-44">
                    <Select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)} categoria="pessoas">
                      <option value="">Qualquer origem</option>
                      {origensDisponiveis.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="w-full sm:w-48">
                  <Select value={filtroUltimoContato} onChange={(e) => setFiltroUltimoContato(e.target.value as typeof filtroUltimoContato)} categoria="pessoas">
                    <option value="">Qualquer último contato</option>
                    <option value="ate3d">Até 3 dias</option>
                    <option value="4a7d">4 a 7 dias</option>
                    <option value="8a14d">8 a 14 dias</option>
                    <option value="15d">15+ dias</option>
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
                        leads={leadsFiltrados}
                        funis={funis}
                        selecionadoId={selecionadoId}
                        onSelecionar={(id) => setSelecionadoId(id === selecionadoId ? null : id)}
                        onMoverLead={aoMoverLead}
                        onReordenarFunis={aoReordenarFunis}
                        onCriarFunil={aoCriarFunil}
                        onRenomearFunil={aoRenomearFunil}
                        onExcluirFunil={aoExcluirFunil}
                        ultimoContato={ultimoContatoPorLead}
                      />
                    ) : (
                      <TabelaLeads
                        leads={leadsFiltrados}
                        funis={funis}
                        selecionadoId={selecionadoId}
                        onSelecionar={(id) => setSelecionadoId(id === selecionadoId ? null : id)}
                        ultimoContato={ultimoContatoPorLead}
                        aoAdicionarLead={() => setAba('novo')}
                      />
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

        {aba === 'whatsapp' && (
          <Panel>
            <PanelHeader titulo="Conectar WhatsApp" desc="Status da conexão oficial (Meta Business Cloud API) usada pelas convocações de equipe e pelas automações do CRM." />
            <ConectarWhatsapp />
          </Panel>
        )}
      </Conteudo>
      {confirmar.dialogo}
    </>
  );
}
