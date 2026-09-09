import { CheckCircle2, Filter, MessageCircle, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { atualizarLead, criarLead, excluirLead, listarLeads, obterLead } from '../lib/api/leads';
import { atualizarFunil, criarFunil, excluirFunil, listarFunis, reordenarFunis } from '../lib/api/funis';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoBarras } from '../components/charts/GraficoBarras';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader, Segmented } from '../components/Panel';
import { Conversas } from '../components/crm/Conversas';
import { DetalheLead } from '../components/crm/DetalheLead';
import { LeadForm } from '../components/crm/LeadForm';
import { PipelineLeads } from '../components/crm/PipelineLeads';
import { TabelaLeads } from '../components/crm/TabelaLeads';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { corFunilPorIndice } from '../lib/status';
import { useConfirmDialog } from '../lib/useConfirmDialog';
import type { FunilLead, Lead, StatusLead } from '../lib/types';

type Aba = 'leads' | 'conversas' | 'novo';
const ABAS: { id: Aba; rotulo: string; Icone: typeof Users }[] = [
  { id: 'leads', rotulo: 'Leads', Icone: Users },
  { id: 'conversas', rotulo: 'Conversas', Icone: MessageCircle },
  { id: 'novo', rotulo: 'Adicionar Lead', Icone: UserPlus },
];

export default function Crm() {
  const [aba, setAba] = useState<Aba>('leads');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [todosLeads, setTodosLeads] = useState<Lead[]>([]);
  const [funis, setFunis] = useState<FunilLead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusLead | ''>('');

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
      await criarLead(dados);
      setFormKey((k) => k + 1);
      carregar();
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
    } catch (e) {
      window.alert(mensagemDeErro(e));
      carregar();
    }
  }

  async function aoReordenarFunis(idsNaOrdem: string[]) {
    setFunis((prev) => idsNaOrdem.map((id, ordem) => ({ ...(prev.find((f) => f.id === id) as FunilLead), ordem })));
    try {
      await reordenarFunis(idsNaOrdem);
    } catch (e) {
      window.alert(mensagemDeErro(e));
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
            </MetricGrid>

            {funis.length > 0 && leads.length > 0 && (
              <Panel className="mb-4">
                <PanelHeader titulo="Leads por funil" desc="Quantos leads estão em cada coluna do Pipeline, nesta busca/filtro." />
                <GraficoBarras
                  dados={funis.map((f, i) => ({ rotulo: f.nome, valor: leads.filter((l) => l.status === f.id).length, corClasse: corFunilPorIndice(i) }))}
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
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome, telefone ou e-mail"
                  className="min-w-[180px] flex-1 rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-people"
                />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="rounded-sm border border-line bg-input px-3 py-2 text-sm text-text outline-none focus:border-people"
                >
                  <option value="">Todos os status</option>
                  {funis.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
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
                      <p className="py-10 text-center text-sm text-text-dim">Carregando…</p>
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
      </Conteudo>
      {confirmar.dialogo}
    </>
  );
}
