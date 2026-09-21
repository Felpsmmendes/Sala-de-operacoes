import { CheckCircle2, Plus, TrendingUp, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  atualizarLeadPlataforma,
  criarLeadPlataforma,
  excluirLeadPlataforma,
  listarInteracoesLeadPlataforma,
  listarLeadsPlataforma,
  moverEtapaLeadPlataforma,
  registrarInteracaoLeadPlataforma,
  type NovoLeadPlataforma,
} from '../lib/api/leadsPlataforma';
import { Badge } from '../components/ui/Badge';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { Textarea } from '../components/ui/Textarea';
import { formatarData, formatarMoeda } from '../lib/format';
import { useToast } from '../lib/toast';
import type { EtapaLeadPlataforma, InteracaoLeadPlataforma, LeadPlataforma, PlanoEmpresa, TipoInteracaoLeadPlataforma } from '../lib/types';

const ETAPAS_KANBAN: { id: EtapaLeadPlataforma; rotulo: string }[] = [
  { id: 'lead', rotulo: 'Lead' },
  { id: 'contato', rotulo: 'Contato' },
  { id: 'demonstracao', rotulo: 'Demonstração' },
  { id: 'proposta', rotulo: 'Proposta' },
  { id: 'negociacao', rotulo: 'Negociação' },
];

const TODAS_ETAPAS: { id: EtapaLeadPlataforma; rotulo: string }[] = [...ETAPAS_KANBAN, { id: 'ganho', rotulo: 'Ganho' }, { id: 'perdido', rotulo: 'Perdido' }];

const PLANO_ROTULO: Record<PlanoEmpresa, string> = { essencial: 'Essencial', profissional: 'Profissional', enterprise: 'Enterprise' };
const TIPO_INTERACAO_ROTULO: Record<TipoInteracaoLeadPlataforma, string> = { mensagem_whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail', reuniao: 'Reunião', nota: 'Nota' };

export default function Crm() {
  const { sucesso, erro: erroToast } = useToast();
  const [leads, setLeads] = useState<LeadPlataforma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  function aoFalhar(e: unknown) {
    erroToast(e instanceof Error ? e.message : 'Algo deu errado.');
  }

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setLeads(await listarLeadsPlataforma());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar leads.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoMoverEtapa(id: string, etapa: EtapaLeadPlataforma) {
    setLeads((atual) => atual.map((l) => (l.id === id ? { ...l, etapa } : l)));
    try {
      await moverEtapaLeadPlataforma(id, etapa);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  const leadsAtivos = leads.filter((l) => l.etapa !== 'ganho' && l.etapa !== 'perdido');
  const ganhos = leads.filter((l) => l.etapa === 'ganho').length;
  const valorPotencialAtivo = leadsAtivos.reduce((s, l) => s + (l.valor_potencial ?? 0), 0);
  const selecionado = leads.find((l) => l.id === selecionadoId) ?? null;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-text">Possíveis clientes</h1>
        <p className="text-[12.5px] text-text-faint">Funil de vendas da plataforma — empresas que podem virar tenant.</p>
      </div>

      <MetricGrid>
        <MetricCard Icone={TrendingUp} rotulo="Leads ativos" valor={String(leadsAtivos.length)} legenda="Fora de ganho/perdido" />
        <MetricCard Icone={TrendingUp} rotulo="Valor potencial" valor={formatarMoeda(valorPotencialAtivo)} legenda="Soma do funil ativo" />
        <MetricCard Icone={CheckCircle2} rotulo="Convertidos" valor={String(ganhos)} legenda="Marcados como ganho" />
      </MetricGrid>

      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12.5px] text-text-faint">{leadsAtivos.length} no funil ativo</p>
        <button type="button" onClick={() => setNovoAberto(true)} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Novo lead
        </button>
      </div>

      {carregando ? (
        <SkeletonLinhas />
      ) : leads.length === 0 ? (
        <EstadoVazio Icone={TrendingUp} titulo="Nenhum lead cadastrado ainda" descricao='Clique em "Novo lead" pra cadastrar a primeira empresa interessada.' />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[900px] gap-3">
            {ETAPAS_KANBAN.map((etapa) => {
              const doEstagio = leadsAtivos.filter((l) => l.etapa === etapa.id);
              return (
                <div key={etapa.id} className="flex w-56 flex-shrink-0 flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">{etapa.rotulo}</p>
                    <span className="font-mono text-[11px] text-text-faint">{doEstagio.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {doEstagio.map((l) => (
                      <button key={l.id} type="button" onClick={() => setSelecionadoId(l.id)} className="rounded-md border border-line bg-input p-3 text-left text-sm hover:bg-raised">
                        <strong className="block truncate text-text">{l.nome_empresa}</strong>
                        {l.origem && <span className="text-[11px] text-text-faint">{l.origem}</span>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {l.plano_interesse ? <Badge tom="neutro" texto={PLANO_ROTULO[l.plano_interesse]} /> : <span />}
                          {l.valor_potencial != null && <span className="font-mono text-[11.5px] text-text-dim">{formatarMoeda(l.valor_potencial)}</span>}
                        </div>
                      </button>
                    ))}
                    {doEstagio.length === 0 && <p className="rounded-md border border-dashed border-line px-3 py-4 text-center text-[11.5px] text-text-faint">Vazio</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {novoAberto && <DrawerNovoLead onFechar={() => setNovoAberto(false)} onCriado={(l) => { setLeads((atual) => [l, ...atual]); sucesso(`${l.nome_empresa} adicionada ao funil.`); }} onErro={aoFalhar} />}

      {selecionado && (
        <DrawerDetalheLead
          lead={selecionado}
          onFechar={() => setSelecionadoId(null)}
          onMoverEtapa={(etapa) => aoMoverEtapa(selecionado.id, etapa)}
          onAtualizado={(dados) => setLeads((atual) => atual.map((l) => (l.id === selecionado.id ? { ...l, ...dados } : l)))}
          onExcluido={() => {
            setLeads((atual) => atual.filter((l) => l.id !== selecionado.id));
            setSelecionadoId(null);
            sucesso('Lead excluído.');
          }}
          onErro={aoFalhar}
        />
      )}
    </>
  );
}

function DrawerNovoLead({ onFechar, onCriado, onErro }: { onFechar: () => void; onCriado: (lead: LeadPlataforma) => void; onErro: (e: unknown) => void }) {
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');
  const [contatoEmail, setContatoEmail] = useState('');
  const [origem, setOrigem] = useState('');
  const [planoInteresse, setPlanoInteresse] = useState<'' | PlanoEmpresa>('');
  const [valorPotencial, setValorPotencial] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function aoCriar() {
    if (!nomeEmpresa.trim()) return;
    setSalvando(true);
    const dados: NovoLeadPlataforma = {
      nome_empresa: nomeEmpresa.trim(),
      contato_nome: contatoNome.trim() || null,
      contato_telefone: contatoTelefone.trim() || null,
      contato_email: contatoEmail.trim() || null,
      origem: origem.trim() || null,
      plano_interesse: planoInteresse || null,
      valor_potencial: valorPotencial ? Number(valorPotencial) : null,
      observacoes: null,
    };
    try {
      onCriado(await criarLeadPlataforma(dados));
      onFechar();
    } catch (e) {
      onErro(e);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Drawer titulo="Novo lead" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <Input rotulo="Nome da empresa" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex: Buffet Sabor & Arte" />
        <Input rotulo="Contato — nome" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} />
        <Input rotulo="Contato — telefone" value={contatoTelefone} onChange={(e) => setContatoTelefone(e.target.value)} />
        <Input rotulo="Contato — e-mail" value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)} />
        <Input rotulo="Origem (opcional)" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex: indicação, site, evento…" />
        <Select rotulo="Plano de interesse (opcional)" value={planoInteresse} onChange={(e) => setPlanoInteresse(e.target.value as '' | PlanoEmpresa)}>
          <option value="">Sem definir</option>
          {(Object.keys(PLANO_ROTULO) as PlanoEmpresa[]).map((p) => (
            <option key={p} value={p}>
              {PLANO_ROTULO[p]}
            </option>
          ))}
        </Select>
        <Input rotulo="Valor potencial — R$/mês (opcional)" type="number" min={0} step="0.01" value={valorPotencial} onChange={(e) => setValorPotencial(e.target.value)} />
        <button type="button" disabled={salvando || !nomeEmpresa.trim()} onClick={aoCriar} className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Criar lead'}
        </button>
      </div>
    </Drawer>
  );
}

function DrawerDetalheLead({
  lead,
  onFechar,
  onMoverEtapa,
  onAtualizado,
  onExcluido,
  onErro,
}: {
  lead: LeadPlataforma;
  onFechar: () => void;
  onMoverEtapa: (etapa: EtapaLeadPlataforma) => void;
  onAtualizado: (dados: Partial<LeadPlataforma>) => void;
  onExcluido: () => void;
  onErro: (e: unknown) => void;
}) {
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? '');
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [interacoes, setInteracoes] = useState<InteracaoLeadPlataforma[]>([]);
  const [carregandoInteracoes, setCarregandoInteracoes] = useState(true);
  const [novaInteracao, setNovaInteracao] = useState('');
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracaoLeadPlataforma>('nota');
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    setCarregandoInteracoes(true);
    listarInteracoesLeadPlataforma(lead.id)
      .then(setInteracoes)
      .catch(onErro)
      .finally(() => setCarregandoInteracoes(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  async function aoSalvarObs() {
    setSalvandoObs(true);
    try {
      await atualizarLeadPlataforma(lead.id, { observacoes: observacoes.trim() || null });
      onAtualizado({ observacoes: observacoes.trim() || null });
    } catch (e) {
      onErro(e);
    } finally {
      setSalvandoObs(false);
    }
  }

  async function aoRegistrarInteracao() {
    if (!novaInteracao.trim()) return;
    setRegistrando(true);
    try {
      await registrarInteracaoLeadPlataforma(lead.id, tipoInteracao, novaInteracao.trim());
      setInteracoes(await listarInteracoesLeadPlataforma(lead.id));
      setNovaInteracao('');
    } catch (e) {
      onErro(e);
    } finally {
      setRegistrando(false);
    }
  }

  async function aoExcluir() {
    try {
      await excluirLeadPlataforma(lead.id);
      onExcluido();
    } catch (e) {
      onErro(e);
    }
  }

  return (
    <Drawer titulo={lead.nome_empresa} onFechar={onFechar} largura="460px">
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-line bg-input p-3 text-[12.5px]">
          {lead.contato_nome && <p className="text-text">{lead.contato_nome}</p>}
          {lead.contato_telefone && <p className="text-text-dim">{lead.contato_telefone}</p>}
          {lead.contato_email && <p className="text-text-dim">{lead.contato_email}</p>}
          {lead.origem && <p className="mt-1 text-[11px] text-text-faint">Origem: {lead.origem}</p>}
          {lead.plano_interesse && (
            <p className="mt-1 text-[11px] text-text-faint">
              Plano de interesse: {PLANO_ROTULO[lead.plano_interesse]}
              {lead.valor_potencial != null && ` · ${formatarMoeda(lead.valor_potencial)}/mês`}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Etapa</p>
          <Select value={lead.etapa} onChange={(e) => onMoverEtapa(e.target.value as EtapaLeadPlataforma)}>
            {TODAS_ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.rotulo}
              </option>
            ))}
          </Select>
        </div>

        {lead.etapa !== 'ganho' && lead.etapa !== 'perdido' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => onMoverEtapa('ganho')} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-[12.5px] font-semibold text-success hover:bg-success/20">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Marcar ganho
            </button>
            <button type="button" onClick={() => onMoverEtapa('perdido')} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] font-semibold text-danger hover:bg-danger/20">
              <XCircle className="h-3.5 w-3.5" strokeWidth={2} /> Marcar perdido
            </button>
          </div>
        )}
        {lead.etapa === 'ganho' && <p className="text-[11.5px] text-success">Ganho — cadastre a empresa em Empresas quando fechar de verdade (ainda é manual).</p>}

        <Textarea rotulo="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas sobre esta negociação…" />
        <button type="button" disabled={salvandoObs} onClick={aoSalvarObs} className="self-start rounded-md border border-line px-3 py-1.5 text-[12px] text-text-dim hover:bg-raised hover:text-text disabled:opacity-50">
          {salvandoObs ? 'Salvando…' : 'Salvar observações'}
        </button>

        <div className="border-t border-line pt-4">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Últimas interações</p>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="w-32 flex-shrink-0">
              <Select value={tipoInteracao} onChange={(e) => setTipoInteracao(e.target.value as TipoInteracaoLeadPlataforma)}>
                {(Object.keys(TIPO_INTERACAO_ROTULO) as TipoInteracaoLeadPlataforma[]).map((t) => (
                  <option key={t} value={t}>
                    {TIPO_INTERACAO_ROTULO[t]}
                  </option>
                ))}
              </Select>
            </div>
            <Input value={novaInteracao} onChange={(e) => setNovaInteracao(e.target.value)} placeholder="Ex: Ligação realizada, interesse no plano Professional" className="flex-1" />
            <button type="button" disabled={registrando || !novaInteracao.trim()} onClick={aoRegistrarInteracao} className="rounded-md bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              +
            </button>
          </div>
          {carregandoInteracoes ? (
            <SkeletonLinhas />
          ) : interacoes.length === 0 ? (
            <p className="text-[12px] text-text-faint">Nenhuma interação registrada ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {interacoes.map((i) => (
                <div key={i.id} className="rounded-md border border-line bg-input px-3 py-2 text-[12px]">
                  <p className="text-text">{i.conteudo}</p>
                  <p className="mt-0.5 text-[10.5px] text-text-faint">
                    {TIPO_INTERACAO_ROTULO[i.tipo]} · {formatarData(i.criado_em)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={aoExcluir} className="self-start text-[11.5px] font-medium text-danger hover:underline">
          Excluir lead
        </button>
      </div>
    </Drawer>
  );
}
