import { Building2, CheckCircle2, ExternalLink, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { atualizarModulosEmpresa, atualizarPlanoEmpresa, atualizarResumoEmpresa, atualizarStatusEmpresa, criarEmpresa, listarEmpresas } from '../lib/api/empresas';
import { Badge } from '../components/ui/Badge';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Titulo } from '../components/Titulo';
import { Panel, PanelHeader } from '../components/Panel';
import { Avatar } from '../components/ui/Avatar';
import { Checkbox } from '../components/ui/Checkbox';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { Textarea } from '../components/ui/Textarea';
import { formatarData, formatarMoeda, normalizarTexto } from '../lib/format';
import { MODULOS, PLANO_ROTULO, STATUS_EMPRESA_INFO as STATUS_INFO } from '../lib/rotulos';
import { useToast } from '../lib/toast';
import type { Empresa, ModuloPlataforma, PlanoEmpresa, StatusEmpresa } from '../lib/types';

export default function Empresas() {
  const { sucesso, erro: erroToast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroPlano, setFiltroPlano] = useState<'todos' | PlanoEmpresa>('todos');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [aba, setAba] = useState<'resumo' | 'modulos'>('resumo');
  const [novaAberta, setNovaAberta] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoSlug, setNovoSlug] = useState('');
  const [criando, setCriando] = useState(false);
  const [salvandoResumo, setSalvandoResumo] = useState(false);

  function aoFalhar(e: unknown) {
    erroToast(e instanceof Error ? e.message : 'Algo deu errado.');
  }

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setEmpresas(await listarEmpresas());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar empresas.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const empresasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca.trim());
    return empresas.filter((e) => (filtroPlano === 'todos' || e.plano === filtroPlano) && (!termo || normalizarTexto(e.nome).includes(termo)));
  }, [empresas, busca, filtroPlano]);

  const selecionada = empresas.find((e) => e.id === selecionadaId) ?? null;
  const mrrTotal = empresas.reduce((s, e) => s + e.mrr, 0);
  const ativas = empresas.filter((e) => e.status === 'ativa').length;

  function selecionar(id: string) {
    setSelecionadaId(id);
    setAba('resumo');
  }

  async function aoMudarPlano(id: string, plano: PlanoEmpresa) {
    setEmpresas((atual) => atual.map((e) => (e.id === id ? { ...e, plano } : e)));
    try {
      await atualizarPlanoEmpresa(id, plano);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  async function aoMudarStatus(id: string, status: StatusEmpresa) {
    setEmpresas((atual) => atual.map((e) => (e.id === id ? { ...e, status } : e)));
    try {
      await atualizarStatusEmpresa(id, status);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  async function aoCriarEmpresa() {
    if (!novoNome.trim() || !novoSlug.trim()) return;
    setCriando(true);
    try {
      const nova = await criarEmpresa({ nome: novoNome.trim(), slug: novoSlug.trim() });
      setEmpresas((atual) => [...atual, nova]);
      setNovaAberta(false);
      setNovoNome('');
      setNovoSlug('');
      sucesso(`${nova.nome} cadastrada.`);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriando(false);
    }
  }

  async function aoSalvarResumo(id: string, dados: { mrr: number; proxima_cobranca: string | null; ultimo_pagamento_em: string | null; saude: number; observacoes: string | null; url_sistema: string | null }) {
    setSalvandoResumo(true);
    try {
      await atualizarResumoEmpresa(id, dados);
      setEmpresas((atual) => atual.map((e) => (e.id === id ? { ...e, ...dados } : e)));
      sucesso('Resumo atualizado.');
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvandoResumo(false);
    }
  }

  async function aoMudarModulo(id: string, moduloId: ModuloPlataforma, ativo: boolean) {
    const atual = empresas.find((e) => e.id === id);
    if (!atual) return;
    const modulos = ativo ? [...atual.modulos_ativos, moduloId] : atual.modulos_ativos.filter((m) => m !== moduloId);
    setEmpresas((prev) => prev.map((e) => (e.id === id ? { ...e, modulos_ativos: modulos } : e)));
    try {
      await atualizarModulosEmpresa(id, modulos);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  return (
    <>
      <Titulo titulo="Empresas" subtitulo="Clientes ativos e sistemas — plano, módulos, cobrança e acesso de cada empresa." />

      <MetricGrid>
        <MetricCard Icone={Building2} rotulo="Empresas" valor={String(empresas.length)} legenda={`${ativas} ativa(s)`} />
        <MetricCard Icone={Building2} rotulo="MRR somado" valor={formatarMoeda(mrrTotal)} legenda="Digitado manualmente por empresa" />
        <MetricCard Icone={Building2} rotulo="Saúde média" valor={empresas.length > 0 ? `${Math.round(empresas.reduce((s, e) => s + e.saude, 0) / empresas.length)}%` : '—'} legenda="Ajustada à mão" />
      </MetricGrid>

      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <Panel>
        <PanelHeader
          titulo="Empresas"
          desc={carregando ? undefined : `${empresasFiltradas.length} de ${empresas.length}`}
          acao={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-52">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" strokeWidth={2} />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa…" className="pl-8" />
              </div>
              <div className="w-40">
                <Select value={filtroPlano} onChange={(e) => setFiltroPlano(e.target.value as 'todos' | PlanoEmpresa)}>
                  <option value="todos">Todos os planos</option>
                  {(Object.keys(PLANO_ROTULO) as PlanoEmpresa[]).map((p) => (
                    <option key={p} value={p}>
                      {PLANO_ROTULO[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <button type="button" onClick={() => setNovaAberta(true)} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Nova empresa
              </button>
            </div>
          }
        />

        {carregando ? (
          <SkeletonLinhas />
        ) : empresas.length === 0 ? (
          <EstadoVazio Icone={Building2} titulo="Nenhuma empresa cadastrada ainda" descricao='Clique em "Nova empresa" pra cadastrar a primeira.' />
        ) : empresasFiltradas.length === 0 ? (
          <EstadoVazio Icone={Search} titulo="Nenhuma empresa encontrada" descricao={`Nenhum nome bate com "${busca}".`} />
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[720px] flex-col gap-2">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
                <span>Empresa</span>
                <span>Plano</span>
                <span>Status</span>
                <span>MRR</span>
                <span>Próx. cobrança</span>
                <span>Saúde</span>
              </div>
              {empresasFiltradas.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => selecionar(e.id)}
                  className={`grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 rounded-md border px-3 py-2.5 text-left text-[12.5px] transition-colors ${
                    e.id === selecionadaId ? 'border-accent bg-raised' : 'border-line bg-input hover:bg-raised'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar nome={e.nome} tamanho={26} />
                    <span className="min-w-0 truncate font-medium text-text">{e.nome}</span>
                  </span>
                  <span className="text-text-dim">{PLANO_ROTULO[e.plano]}</span>
                  <Badge tom={STATUS_INFO[e.status].tom} texto={STATUS_INFO[e.status].rotulo} />
                  <span className="font-mono text-text">{formatarMoeda(e.mrr)}</span>
                  <span className="text-text-dim">{e.proxima_cobranca ? formatarData(e.proxima_cobranca) : '—'}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-10 overflow-hidden rounded-full bg-raised">
                      <span className={`block h-full rounded-full ${e.saude >= 80 ? 'bg-success' : e.saude >= 50 ? 'bg-pending' : 'bg-danger'}`} style={{ width: `${e.saude}%` }} />
                    </span>
                    <span className="font-mono text-text-faint">{e.saude}%</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {novaAberta && (
        <Drawer titulo="Nova empresa" onFechar={() => setNovaAberta(false)}>
          <div className="flex flex-col gap-4">
            <Input rotulo="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Buffet Sabor & Arte" />
            <Input
              rotulo="Identificador (slug)"
              value={novoSlug}
              onChange={(e) => setNovoSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="Ex: buffet-sabor-arte"
              dica="Minúsculo, sem espaço."
            />
            <p className="text-[11.5px] text-text-faint">
              Depois de criada, vincule o 1º usuário dela em <code>membros_empresa</code> pelo SQL Editor do Supabase (onboarding completo ainda não existe nesta tela).
            </p>
            <button
              type="button"
              disabled={criando || !novoNome.trim() || !novoSlug.trim()}
              onClick={aoCriarEmpresa}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
            >
              {criando ? 'Criando…' : 'Criar empresa'}
            </button>
          </div>
        </Drawer>
      )}

      {selecionada && (
        <Drawer titulo={selecionada.nome} onFechar={() => setSelecionadaId(null)} largura="480px">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <Avatar nome={selecionada.nome} tamanho={36} />
              <div>
                <p className="font-semibold text-text">{selecionada.nome}</p>
                <p className="text-[11.5px] text-text-faint">
                  {PLANO_ROTULO[selecionada.plano]} · desde {formatarData(selecionada.criado_em)}
                </p>
              </div>
              {selecionada.url_sistema && (
                <a href={selecionada.url_sistema} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12px] font-semibold text-accent-ink hover:bg-accent-strong">
                  Acessar sistema <ExternalLink className="h-3 w-3" strokeWidth={2.5} />
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select rotulo="Plano" value={selecionada.plano} onChange={(e) => aoMudarPlano(selecionada.id, e.target.value as PlanoEmpresa)}>
                {(Object.keys(PLANO_ROTULO) as PlanoEmpresa[]).map((p) => (
                  <option key={p} value={p}>
                    {PLANO_ROTULO[p]}
                  </option>
                ))}
              </Select>
              <Select rotulo="Status" value={selecionada.status} onChange={(e) => aoMudarStatus(selecionada.id, e.target.value as StatusEmpresa)}>
                {(Object.keys(STATUS_INFO) as StatusEmpresa[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_INFO[s].rotulo}
                  </option>
                ))}
              </Select>
            </div>

            <div className="inline-flex gap-0.5 self-start rounded-md border border-line bg-input p-0.5">
              {(['resumo', 'modulos'] as const).map((a) => (
                <button key={a} type="button" onClick={() => setAba(a)} className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${aba === a ? 'bg-raised text-accent-strong' : 'text-text-dim hover:text-text'}`}>
                  {a === 'resumo' ? 'Resumo' : 'Módulos'}
                </button>
              ))}
            </div>

            {aba === 'resumo' ? (
              <AbaResumo key={selecionada.id} empresa={selecionada} salvando={salvandoResumo} onSalvar={(dados) => aoSalvarResumo(selecionada.id, dados)} />
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-[11.5px] text-text-faint">Guarda a configuração — nenhuma tela de dentro da empresa ainda esconde módulo a partir disso.</p>
                {MODULOS.map((m) => (
                  <Checkbox key={m.id} rotulo={m.rotulo} marcado={selecionada.modulos_ativos.includes(m.id)} onMudar={(v) => aoMudarModulo(selecionada.id, m.id, v)} />
                ))}
              </div>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}

function AbaResumo({
  empresa,
  salvando,
  onSalvar,
}: {
  empresa: Empresa;
  salvando: boolean;
  onSalvar: (dados: { mrr: number; proxima_cobranca: string | null; ultimo_pagamento_em: string | null; saude: number; observacoes: string | null; url_sistema: string | null }) => void;
}) {
  const [mrr, setMrr] = useState(String(empresa.mrr));
  const [proximaCobranca, setProximaCobranca] = useState(empresa.proxima_cobranca ?? '');
  const [ultimoPagamento, setUltimoPagamento] = useState(empresa.ultimo_pagamento_em ?? '');
  const [saude, setSaude] = useState(empresa.saude);
  const [observacoes, setObservacoes] = useState(empresa.observacoes ?? '');
  const [urlSistema, setUrlSistema] = useState(empresa.url_sistema ?? '');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Input rotulo="MRR (R$)" type="number" min={0} step="0.01" value={mrr} onChange={(e) => setMrr(e.target.value)} />
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Saúde</p>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={100} value={saude} onChange={(e) => setSaude(Number(e.target.value))} className="flex-1 accent-accent" />
            <span className="w-10 flex-shrink-0 text-right font-mono text-[12.5px] text-text">{saude}%</span>
          </div>
        </div>
        <Input rotulo="Próxima cobrança" type="date" value={proximaCobranca} onChange={(e) => setProximaCobranca(e.target.value)} />
        <Input rotulo="Último pagamento" type="date" value={ultimoPagamento} onChange={(e) => setUltimoPagamento(e.target.value)} />
      </div>
      {empresa.ultimo_pagamento_em && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-success">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Pago em {formatarData(empresa.ultimo_pagamento_em)}
        </p>
      )}
      <Input rotulo="Endereço do sistema" type="url" value={urlSistema} onChange={(e) => setUrlSistema(e.target.value)} placeholder="https://…" dica="Onde o sistema desta empresa roda — alimenta o botão Acessar sistema." />
      <Textarea rotulo="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas sobre esta empresa…" />
      <ProgressBar valor={saude} tom={saude >= 80 ? 'success' : saude >= 50 ? 'pending' : 'danger'} />
      <button
        type="button"
        disabled={salvando}
        onClick={() => onSalvar({ mrr: Number(mrr) || 0, proxima_cobranca: proximaCobranca || null, ultimo_pagamento_em: ultimoPagamento || null, saude, observacoes: observacoes.trim() || null, url_sistema: urlSistema.trim() || null })}
        className="self-start rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {salvando ? 'Salvando…' : 'Salvar resumo'}
      </button>
    </div>
  );
}
