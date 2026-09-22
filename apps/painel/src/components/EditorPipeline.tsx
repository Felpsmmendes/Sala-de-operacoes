import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { excluirEtapa, salvarEtapas } from '../lib/api/etapas';
import { ordenarEtapas } from '../lib/metricas';
import { useToast } from '../lib/toast';
import type { EtapaPipeline } from '../lib/types';
import { Drawer } from './ui/Drawer';
import { Input } from './ui/Input';

type Linha = Pick<EtapaPipeline, 'id' | 'nome' | 'ordem' | 'papel'>;

/** Editor das etapas do pipeline de prospecção. Trabalha sempre com a lista
    inteira: qualquer mudança regrava todas as etapas com `ordem` renumerada
    (0, 1, 2…), então nunca sobra buraco nem empate. As duas etapas especiais
    (ganho e perdido) só podem ser renomeadas — ficam sempre no fim e o painel
    depende delas pra saber o que é "em aberto". */
export function EditorPipeline({ etapas, contagem, onFechar, onMudou }: { etapas: EtapaPipeline[]; contagem: Record<string, number>; onFechar: () => void; onMudou: () => Promise<void> }) {
  const { sucesso, erro: erroToast } = useToast();
  const [ocupado, setOcupado] = useState(false);
  const [novoNome, setNovoNome] = useState('');

  const ordenadas = ordenarEtapas(etapas);
  const comuns = ordenadas.filter((e) => e.papel === null);
  const especiais = ordenadas.filter((e) => e.papel !== null);

  async function gravar(lista: Linha[], mensagemOk?: string) {
    setOcupado(true);
    try {
      await salvarEtapas(lista.map((e, i) => ({ ...e, ordem: i })));
      await onMudou();
      if (mensagemOk) sucesso(mensagemOk);
    } catch (e) {
      erroToast(e instanceof Error ? e.message : 'Não consegui salvar o pipeline.');
    } finally {
      setOcupado(false);
    }
  }

  function renomear(id: string, nome: string) {
    const limpo = nome.trim();
    const atual = etapas.find((e) => e.id === id);
    if (!atual || !limpo || limpo === atual.nome) return;
    gravar(
      ordenadas.map((e) => (e.id === id ? { ...e, nome: limpo } : e)),
      'Etapa renomeada.'
    );
  }

  function mover(indice: number, delta: -1 | 1) {
    const destino = indice + delta;
    if (destino < 0 || destino >= comuns.length) return;
    const nova = [...comuns];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
    gravar([...nova, ...especiais]);
  }

  function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    const nova: Linha = { id: crypto.randomUUID(), nome, ordem: comuns.length, papel: null };
    setNovoNome('');
    gravar([...comuns, nova, ...especiais], `Etapa "${nome}" criada.`);
  }

  async function excluir(e: Linha) {
    if (!window.confirm(`Excluir a etapa "${e.nome}"?`)) return;
    setOcupado(true);
    try {
      await excluirEtapa(e.id);
      await gravar(ordenadas.filter((x) => x.id !== e.id));
      sucesso('Etapa excluída.');
    } catch (err) {
      erroToast(err instanceof Error ? err.message : 'Não consegui excluir a etapa.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Drawer titulo="Editar pipeline" onFechar={onFechar} largura="460px">
      <div className="flex flex-col gap-5">
        <p className="text-[12px] text-text-faint">Renomeie, reordene, crie ou exclua as etapas. As colunas do quadro seguem esta ordem.</p>

        <div className="flex flex-col gap-2">
          {comuns.map((e, i) => {
            const qtd = contagem[e.id] ?? 0;
            return (
              <div key={e.id} className="flex items-center gap-2 rounded-md border border-line bg-input p-2">
                <div className="flex flex-col">
                  <button type="button" disabled={ocupado || i === 0} onClick={() => mover(i, -1)} aria-label={`Subir ${e.nome}`} className="rounded p-0.5 text-text-faint hover:text-text disabled:opacity-30">
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button type="button" disabled={ocupado || i === comuns.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer ${e.nome}`} className="rounded p-0.5 text-text-faint hover:text-text disabled:opacity-30">
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                <input
                  key={`${e.id}-${e.nome}`}
                  defaultValue={e.nome}
                  aria-label={`Nome da etapa ${e.nome}`}
                  disabled={ocupado}
                  onBlur={(ev) => renomear(e.id, ev.target.value)}
                  onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-text outline-none hover:border-line focus:border-accent"
                />
                <span className="flex-shrink-0 font-mono text-[11px] text-text-faint" title="Leads nesta etapa">
                  {qtd}
                </span>
                <button
                  type="button"
                  disabled={ocupado || qtd > 0}
                  onClick={() => excluir(e)}
                  aria-label={`Excluir ${e.nome}`}
                  title={qtd > 0 ? `Tem ${qtd} lead${qtd > 1 ? 's' : ''} — mova antes de excluir` : 'Excluir etapa'}
                  className="flex-shrink-0 rounded p-1 text-text-faint hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
          {comuns.length === 0 && <p className="rounded-md border border-dashed border-line px-3 py-3 text-center text-[12px] text-text-faint">Nenhuma etapa em aberto. Crie a primeira abaixo.</p>}
        </div>

        <div className="flex items-end gap-2">
          <Input rotulo="Nova etapa" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} placeholder="Ex: Follow-up" />
          <button type="button" disabled={ocupado || !novoNome.trim()} onClick={adicionar} className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-2.5 text-[12.5px] font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Adicionar
          </button>
        </div>

        <div className="border-t border-line pt-4">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">Etapas finais</p>
          <p className="mb-2 text-[11.5px] text-text-faint">Ficam sempre no fim e não podem ser excluídas — o painel usa elas pra saber quem virou cliente e quem saiu do funil.</p>
          <div className="flex flex-col gap-2">
            {especiais.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-md border border-line bg-input p-2">
                <span className={`ml-1 h-2 w-2 flex-shrink-0 rounded-full ${e.papel === 'ganho' ? 'bg-success' : 'bg-danger'}`} />
                <input
                  key={`${e.id}-${e.nome}`}
                  defaultValue={e.nome}
                  aria-label={`Nome da etapa ${e.nome}`}
                  disabled={ocupado}
                  onBlur={(ev) => renomear(e.id, ev.target.value)}
                  onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-text outline-none hover:border-line focus:border-accent"
                />
                <span className="flex-shrink-0 font-mono text-[11px] text-text-faint">{contagem[e.id] ?? 0}</span>
                <span className="w-[26px] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
