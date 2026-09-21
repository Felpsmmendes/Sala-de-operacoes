import { AlertTriangle, CheckCircle2, Clock, CalendarClock, Plus, Trash2, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { Titulo } from '../components/Titulo';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Drawer';
import { EstadoVazio } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { Textarea } from '../components/ui/Textarea';
import { adicionarComentario, atualizarChamado, criarChamado, excluirChamado, listarChamados, listarComentarios } from '../lib/api/chamados';
import { listarEmpresas } from '../lib/api/empresas';
import { useAuth } from '../lib/AuthContext';
import { formatarDataHora } from '../lib/format';
import { resumoChamados } from '../lib/metricas';
import { MODULOS, PRIORIDADE_INFO, STATUS_CHAMADO_INFO, rotuloModulo } from '../lib/rotulos';
import { useToast } from '../lib/toast';
import type { ChamadoComEmpresa, ComentarioChamado, Empresa, PrioridadeChamado, StatusChamado } from '../lib/types';

type Filtro = 'todos' | 'abertos' | StatusChamado;

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'abertos', rotulo: 'Em aberto' },
  { id: 'em_andamento', rotulo: 'Em andamento' },
  { id: 'agendado', rotulo: 'Agendados' },
  { id: 'resolvido', rotulo: 'Resolvidos' },
  { id: 'todos', rotulo: 'Todos' },
];

const ORDEM_PRIORIDADE: Record<PrioridadeChamado, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };

export default function Manutencoes() {
  const { session } = useAuth();
  const { sucesso, erro: erroToast } = useToast();
  const [chamados, setChamados] = useState<ChamadoComEmpresa[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('abertos');

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<ComentarioChamado[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [novoAberto, setNovoAberto] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [modulo, setModulo] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeChamado>('media');
  const [responsavel, setResponsavel] = useState('');
  const [criando, setCriando] = useState(false);

  const autor = ((session?.user?.user_metadata as { nome?: string } | undefined)?.nome || session?.user?.email?.split('@')[0] || null) as string | null;

  function aoFalhar(e: unknown) {
    erroToast(e instanceof Error ? e.message : 'Algo deu errado.');
  }

  async function carregar() {
    setErro(null);
    try {
      const [ch, emp] = await Promise.all([listarChamados(), listarEmpresas()]);
      setChamados(ch);
      setEmpresas(emp);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar chamados.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const resumo = resumoChamados(chamados);

  const visiveis = useMemo(() => {
    const lista = chamados.filter((c) => (filtro === 'todos' ? true : filtro === 'abertos' ? c.status !== 'resolvido' : c.status === filtro));
    return lista.sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || b.criado_em.localeCompare(a.criado_em));
  }, [chamados, filtro]);

  const selecionado = chamados.find((c) => c.id === selecionadoId) ?? null;

  async function abrirChamado(id: string) {
    setSelecionadoId(id);
    setComentarios([]);
    setNovoComentario('');
    try {
      setComentarios(await listarComentarios(id));
    } catch (e) {
      aoFalhar(e);
    }
  }

  async function aoMudar(id: string, dados: { status?: StatusChamado; prioridade?: PrioridadeChamado; responsavel?: string | null }) {
    setChamados((atual) =>
      atual.map((c) => {
        if (c.id !== id) return c;
        const novo = { ...c, ...dados };
        if (dados.status) novo.resolvido_em = dados.status === 'resolvido' ? new Date().toISOString() : null;
        return novo;
      })
    );
    try {
      await atualizarChamado(id, dados);
    } catch (e) {
      aoFalhar(e);
      carregar();
    }
  }

  async function aoComentar() {
    if (!selecionado || !novoComentario.trim()) return;
    setEnviando(true);
    try {
      await adicionarComentario(selecionado.id, autor, novoComentario.trim());
      setNovoComentario('');
      setComentarios(await listarComentarios(selecionado.id));
    } catch (e) {
      aoFalhar(e);
    } finally {
      setEnviando(false);
    }
  }

  async function aoExcluir(id: string) {
    if (!window.confirm('Excluir este chamado e os comentários dele?')) return;
    try {
      await excluirChamado(id);
      setSelecionadoId(null);
      setChamados((atual) => atual.filter((c) => c.id !== id));
      sucesso('Chamado excluído.');
    } catch (e) {
      aoFalhar(e);
    }
  }

  async function aoCriar() {
    if (!empresaId || !titulo.trim()) return;
    setCriando(true);
    try {
      await criarChamado({ empresa_id: empresaId, titulo: titulo.trim(), descricao: descricao.trim() || null, modulo: modulo || null, prioridade, responsavel: responsavel.trim() || null });
      setNovoAberto(false);
      setEmpresaId('');
      setTitulo('');
      setDescricao('');
      setModulo('');
      setPrioridade('media');
      setResponsavel('');
      sucesso('Chamado aberto.');
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <Titulo
        titulo="Manutenções"
        subtitulo="Central de chamados das empresas."
        acao={
          <button type="button" onClick={() => setNovoAberto(true)} className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Novo chamado
          </button>
        }
      />

      <MetricGrid colunas={4}>
        <MetricCard Icone={AlertTriangle} rotulo="Urgentes" valor={String(resumo.urgentes)} legenda="Ainda não resolvidos" tom={resumo.urgentes > 0 ? 'perigo' : undefined} />
        <MetricCard Icone={Clock} rotulo="Em andamento" valor={String(resumo.emAndamento)} />
        <MetricCard Icone={CalendarClock} rotulo="Agendados" valor={String(resumo.agendados)} />
        <MetricCard Icone={CheckCircle2} rotulo="Resolvidos" valor={String(resumo.resolvidos)} tom={resumo.resolvidos > 0 ? 'sucesso' : undefined} />
      </MetricGrid>

      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <Panel>
        <PanelHeader
          titulo="Chamados"
          desc={carregando ? undefined : `${visiveis.length} de ${chamados.length}`}
          acao={
            <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-line bg-input p-0.5">
              {FILTROS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFiltro(f.id)} className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filtro === f.id ? 'bg-raised text-accent-strong' : 'text-text-dim hover:text-text'}`}>
                  {f.rotulo}
                </button>
              ))}
            </div>
          }
        />

        {carregando ? (
          <SkeletonLinhas />
        ) : chamados.length === 0 ? (
          <EstadoVazio Icone={Wrench} titulo="Nenhum chamado ainda" descricao='Clique em "Novo chamado" pra registrar o primeiro.' />
        ) : visiveis.length === 0 ? (
          <EstadoVazio Icone={CheckCircle2} titulo="Nada neste filtro" />
        ) : (
          <div className="overflow-x-auto">
            <div className="flex min-w-[820px] flex-col gap-2">
              <div className="grid grid-cols-[1.1fr_1.7fr_1fr_0.8fr_1fr_0.8fr_1fr] gap-3 px-3 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">
                <span>Empresa</span>
                <span>Problema</span>
                <span>Módulo</span>
                <span>Prioridade</span>
                <span>Aberto em</span>
                <span>Resp.</span>
                <span>Status</span>
              </div>
              {visiveis.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => abrirChamado(c.id)}
                  className={`grid grid-cols-[1.1fr_1.7fr_1fr_0.8fr_1fr_0.8fr_1fr] items-center gap-3 rounded-md border px-3 py-2.5 text-left text-[12.5px] transition-colors ${c.id === selecionadoId ? 'border-accent bg-raised' : 'border-line bg-input hover:bg-raised'}`}
                >
                  <span className="truncate font-medium text-text">{c.empresa?.nome ?? '—'}</span>
                  <span className="truncate text-text">{c.titulo}</span>
                  <span className="truncate text-text-dim">{rotuloModulo(c.modulo)}</span>
                  <Badge tom={PRIORIDADE_INFO[c.prioridade].tom} texto={PRIORIDADE_INFO[c.prioridade].rotulo} />
                  <span className="text-text-dim">{formatarDataHora(c.criado_em)}</span>
                  <span className="truncate text-text-dim">{c.responsavel ?? '—'}</span>
                  <Badge tom={STATUS_CHAMADO_INFO[c.status].tom} texto={STATUS_CHAMADO_INFO[c.status].rotulo} />
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {novoAberto && (
        <Drawer titulo="Novo chamado" onFechar={() => setNovoAberto(false)}>
          <div className="flex flex-col gap-4">
            <Select rotulo="Empresa" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
              <option value="">Selecione…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
            <Input rotulo="Problema" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Erro no fechamento financeiro" />
            <Textarea rotulo="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que aconteceu, como reproduzir…" />
            <div className="grid grid-cols-2 gap-3">
              <Select rotulo="Módulo" value={modulo} onChange={(e) => setModulo(e.target.value)}>
                <option value="">Geral</option>
                {MODULOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.rotulo}
                  </option>
                ))}
              </Select>
              <Select rotulo="Prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadeChamado)}>
                {(Object.keys(PRIORIDADE_INFO) as PrioridadeChamado[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORIDADE_INFO[p].rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <Input rotulo="Responsável (opcional)" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            <button type="button" disabled={criando || !empresaId || !titulo.trim()} onClick={aoCriar} className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              {criando ? 'Abrindo…' : 'Abrir chamado'}
            </button>
          </div>
        </Drawer>
      )}

      {selecionado && (
        <Drawer titulo={selecionado.titulo} onFechar={() => setSelecionadoId(null)} largura="520px">
          <div className="flex flex-col gap-5">
            <p className="text-[12px] text-text-faint">
              {selecionado.empresa?.nome ?? 'Empresa'} · {rotuloModulo(selecionado.modulo)} · aberto em {formatarDataHora(selecionado.criado_em)}
              {selecionado.resolvido_em && ` · resolvido em ${formatarDataHora(selecionado.resolvido_em)}`}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Select rotulo="Status" value={selecionado.status} onChange={(e) => aoMudar(selecionado.id, { status: e.target.value as StatusChamado })}>
                {(Object.keys(STATUS_CHAMADO_INFO) as StatusChamado[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CHAMADO_INFO[s].rotulo}
                  </option>
                ))}
              </Select>
              <Select rotulo="Prioridade" value={selecionado.prioridade} onChange={(e) => aoMudar(selecionado.id, { prioridade: e.target.value as PrioridadeChamado })}>
                {(Object.keys(PRIORIDADE_INFO) as PrioridadeChamado[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORIDADE_INFO[p].rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <Input key={selecionado.id} rotulo="Responsável" defaultValue={selecionado.responsavel ?? ''} onBlur={(e) => e.target.value.trim() !== (selecionado.responsavel ?? '') && aoMudar(selecionado.id, { responsavel: e.target.value.trim() || null })} />

            {selecionado.descricao && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Descrição</p>
                <p className="whitespace-pre-wrap text-[13px] text-text-dim">{selecionado.descricao}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Comentários ({comentarios.length})</p>
              <div className="mb-3 flex flex-col gap-2">
                {comentarios.length === 0 && <p className="text-[12.5px] text-text-faint">Nenhum comentário ainda.</p>}
                {comentarios.map((c) => (
                  <div key={c.id} className="rounded-md border border-line bg-input px-3 py-2">
                    <p className="mb-0.5 text-[11px] text-text-faint">
                      <strong className="text-text-dim">{c.autor ?? 'Alguém'}</strong> · {formatarDataHora(c.criado_em)}
                    </p>
                    <p className="whitespace-pre-wrap text-[12.5px] text-text">{c.conteudo}</p>
                  </div>
                ))}
              </div>
              <Textarea value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} placeholder="Adicionar comentário…" />
              <button type="button" disabled={enviando || !novoComentario.trim()} onClick={aoComentar} className="mt-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
                {enviando ? 'Enviando…' : 'Comentar'}
              </button>
            </div>

            <button type="button" onClick={() => aoExcluir(selecionado.id)} className="flex items-center gap-1.5 self-start text-[12px] text-text-faint hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} /> Excluir chamado
            </button>
          </div>
        </Drawer>
      )}
    </>
  );
}
