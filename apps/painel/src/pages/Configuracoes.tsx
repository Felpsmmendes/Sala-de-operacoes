import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Panel, PanelHeader } from '../components/Panel';
import { Titulo } from '../components/Titulo';
import { RevealGroup } from '../components/ui/Reveal';
import { Checkbox } from '../components/ui/Checkbox';
import { Drawer } from '../components/ui/Drawer';
import { Input } from '../components/ui/Input';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { listarEmpresas } from '../lib/api/empresas';
import { atualizarPlano, listarPlanos } from '../lib/api/planos';
import { useAuth } from '../lib/AuthContext';
import { formatarMoeda } from '../lib/format';
import { MODULOS } from '../lib/rotulos';
import { useToast } from '../lib/toast';
import type { Empresa, ModuloPlataforma, PlanoPlataforma } from '../lib/types';

export default function Configuracoes() {
  const { session } = useAuth();
  const { sucesso, erro: erroToast } = useToast();
  const [planos, setPlanos] = useState<PlanoPlataforma[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState<PlanoPlataforma | null>(null);
  const [preco, setPreco] = useState('');
  const [modulos, setModulos] = useState<ModuloPlataforma[]>([]);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      const [p, e] = await Promise.all([listarPlanos(), listarEmpresas()]);
      setPlanos(p);
      setEmpresas(e);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os planos.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirEdicao(p: PlanoPlataforma) {
    setEditando(p);
    setPreco(String(p.preco_mensal));
    setModulos(p.modulos);
  }

  async function aoSalvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      await atualizarPlano(editando.chave, { preco_mensal: Number(preco) || 0, modulos });
      sucesso(`Plano ${editando.nome} atualizado.`);
      setEditando(null);
      await carregar();
    } catch (e) {
      erroToast(e instanceof Error ? e.message : 'Não consegui salvar o plano.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Titulo titulo="Configurações" subtitulo="Planos e módulos que a plataforma oferece." />
      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <Panel revelar={0} className="mb-4">
        <PanelHeader titulo="Planos disponíveis" desc="Preço de tabela e módulos de cada plano. O MRR de cada empresa continua sendo digitado na tela Empresas — mudar o preço aqui não altera empresas já cadastradas." />
        {carregando ? (
          <SkeletonLinhas n={3} />
        ) : (
          <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-3" stagger={90}>
            {planos.map((p) => {
              const doPlano = empresas.filter((e) => e.plano === p.chave).length;
              return (
                <div key={p.chave} className="flex flex-col rounded-lg border border-line bg-input p-4">
                  <p className="text-[13px] font-semibold text-text">{p.nome}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-text">
                    {formatarMoeda(p.preco_mensal)}
                    <span className="text-[12px] font-normal text-text-faint">/mês</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-text-faint">
                    {doPlano} empresa{doPlano !== 1 ? 's' : ''} neste plano
                  </p>
                  <ul className="my-4 flex flex-1 flex-col gap-1 text-[12.5px] text-text-dim">
                    {p.modulos.map((m) => (
                      <li key={m} className="flex items-center gap-2">
                        <span className="h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                        {MODULOS.find((x) => x.id === m)?.rotulo ?? m}
                      </li>
                    ))}
                    {p.modulos.length === 0 && <li className="text-text-faint">Nenhum módulo</li>}
                  </ul>
                  <button type="button" onClick={() => abrirEdicao(p)} className="flex items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-[12.5px] font-medium text-text-dim hover:bg-raised hover:text-text">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Editar
                  </button>
                </div>
              );
            })}
          </RevealGroup>
        )}
      </Panel>

      <Panel revelar={120}>
        <PanelHeader titulo="Conta" />
        <dl className="flex flex-col gap-2 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-dim">E-mail</dt>
            <dd className="text-text">{session?.user?.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-dim">Acesso</dt>
            <dd className="text-text">Super admin da plataforma</dd>
          </div>
        </dl>
      </Panel>

      {editando && (
        <Drawer titulo={`Plano ${editando.nome}`} onFechar={() => setEditando(null)}>
          <div className="flex flex-col gap-4">
            <Input rotulo="Preço mensal (R$)" type="number" min={0} step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
            <div className="flex flex-col gap-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Módulos incluídos</p>
              {MODULOS.map((m) => (
                <Checkbox key={m.id} rotulo={m.rotulo} marcado={modulos.includes(m.id)} onMudar={(v) => setModulos((atual) => (v ? [...atual, m.id] : atual.filter((x) => x !== m.id)))} />
              ))}
            </div>
            <button type="button" disabled={salvando} onClick={aoSalvar} className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
              {salvando ? 'Salvando…' : 'Salvar plano'}
            </button>
          </div>
        </Drawer>
      )}
    </>
  );
}
