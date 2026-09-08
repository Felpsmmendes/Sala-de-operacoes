import { AlertTriangle, Calculator, Link2, Package, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  cancelarCompra,
  criarCompra,
  criarItem,
  excluirItem,
  listarCompras,
  listarDescricoesChecklistNaoVinculadas,
  listarItens,
  listarMovimentos,
  receberCompra,
  registrarMovimento,
  vincularDescricaoAoEstoque,
  type CompraComItem,
  type ItemEstoque,
  type MovimentoComItem,
  type NovoItemEstoque,
  type TipoMovimento,
} from '../lib/api/estoque';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { MetricCard, MetricGrid } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { ItemForm } from '../components/estoque/ItemForm';
import { ModalCompra } from '../components/estoque/ModalCompra';
import { ModalMovimento } from '../components/estoque/ModalMovimento';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { formatarData, formatarMoeda } from '../lib/status';

function ehCritico(item: ItemEstoque) {
  return item.estoque_atual <= item.estoque_minimo;
}

type Aba = 'itens' | 'compras' | 'avarias' | 'vinculos';

/** Toda ação de uma linha (excluir/receber/cancelar) precisa tratar erro —
    sem isso, uma restrição do banco (ex.: item com movimentação não pode
    ser excluído) vira uma rejeição de promise não capturada, silenciosa
    pro usuário. */
function aoFalhar(e: unknown) {
  window.alert(mensagemDeErro(e));
}

export default function Estoque() {
  // Achado da auditoria de UX (2026-09-06): calculadora, cadastro, lista,
  // vínculo checklist↔estoque, compras e avarias ficavam tudo empilhado
  // numa rolagem só — o gestor entrava querendo fazer UMA coisa (ex.
  // marcar uma compra recebida) e precisava rolar por tudo antes de
  // chegar lá. Vira abas, mesmo padrão já usado no CRM (`Crm.tsx`).
  const [aba, setAba] = useState<Aba>('itens');
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [compras, setCompras] = useState<CompraComItem[]>([]);
  const [avarias, setAvarias] = useState<MovimentoComItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [movimentoAberto, setMovimentoAberto] = useState<ItemEstoque | null>(null);
  const [compraAberta, setCompraAberta] = useState<ItemEstoque | null>(null);
  const [convidadosCalc, setConvidadosCalc] = useState('');
  const [naoVinculados, setNaoVinculados] = useState<string[]>([]);
  const [vinculando, setVinculando] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [i, c, a, nv] = await Promise.all([listarItens(), listarCompras(), listarMovimentos('avaria'), listarDescricoesChecklistNaoVinculadas()]);
      setItens(i);
      setCompras(c);
      setAvarias(a);
      setNaoVinculados(nv);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  async function aoVincular(descricao: string, estoqueItemId: string) {
    setVinculando(descricao);
    try {
      await vincularDescricaoAoEstoque(descricao, estoqueItemId);
      await carregar();
    } catch (e) {
      aoFalhar(e);
    } finally {
      setVinculando(null);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoCriarItem(dados: NovoItemEstoque) {
    setSalvandoItem(true);
    try {
      await criarItem(dados);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    } finally {
      setSalvandoItem(false);
    }
  }

  async function aoConfirmarMovimento(tipo: TipoMovimento, quantidade: number, observacao: string) {
    if (!movimentoAberto) return;
    try {
      await registrarMovimento({ itemId: movimentoAberto.id, tipo, quantidade, observacao: observacao || null });
      setMovimentoAberto(null);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    }
  }

  async function aoConfirmarCompra(quantidade: number, valorTotal: number) {
    if (!compraAberta) return;
    try {
      await criarCompra({ itemId: compraAberta.id, quantidade, valorTotal });
      setCompraAberta(null);
      await carregar();
    } catch (e) {
      window.alert(mensagemDeErro(e));
    }
  }

  const itensCriticos = itens.filter(ehCritico);
  const comprasPendentes = compras.filter((c) => c.status === 'pendente');

  const previsao = useMemo(() => {
    const convidados = Number(convidadosCalc) || 0;
    if (!convidados) return [];
    return itens
      .filter((i) => i.consumo_por_pax != null)
      .map((i) => {
        const necessario = Math.round((i.consumo_por_pax as number) * convidados * 100) / 100;
        return { item: i, necessario, deficit: Math.max(0, Math.round((necessario - i.estoque_atual) * 100) / 100) };
      });
  }, [itens, convidadosCalc]);

  return (
    <>
      <Cabecalho titulo="Estoque & Compras Críticas" subtitulo="Consumo estimado por convidado, nível mínimo do galpão e histórico de avarias." />
      <Conteudo>
        <MetricGrid>
          <MetricCard Icone={Package} rotulo="Itens cadastrados" valor={String(itens.length)} legenda="No galpão" />
          <MetricCard Icone={AlertTriangle} rotulo="Nível crítico" valor={String(itensCriticos.length)} legenda="Abaixo do mínimo" />
          <MetricCard Icone={ShoppingCart} rotulo="Compras pendentes" valor={String(comprasPendentes.length)} legenda={formatarMoeda(comprasPendentes.reduce((s, c) => s + c.valor_total, 0))} />
          <MetricCard Icone={AlertTriangle} rotulo="Avarias registradas" valor={String(avarias.length)} legenda="Últimos 50 registros" />
        </MetricGrid>

        {erro && <p className="mb-4 rounded-sm border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

        {/* submenu horizontal, sempre visível — mesmo padrão do CRM */}
        <div className="mb-5 flex gap-1 border-b border-line">
          {(
            [
              { id: 'itens', rotulo: 'Itens', Icone: Package },
              { id: 'compras', rotulo: 'Compras', Icone: ShoppingCart, contagem: comprasPendentes.length },
              { id: 'avarias', rotulo: 'Avarias', Icone: AlertTriangle, contagem: avarias.length },
              { id: 'vinculos', rotulo: 'Vínculos', Icone: Link2, contagem: naoVinculados.length },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                aba === item.id ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text'
              }`}
            >
              <item.Icone className="h-4 w-4" strokeWidth={2} />
              {item.rotulo}
              {'contagem' in item && item.contagem > 0 && <span className="rounded-full bg-input px-1.5 text-[11px] text-text-faint">{item.contagem}</span>}
            </button>
          ))}
        </div>

        {aba === 'itens' && (
          <>
            <Panel className="mb-4">
              <PanelHeader titulo="Calculadora preditiva" desc="Quanto vai ser consumido pra X convidados, comparado com o que tem no galpão." acao={<Calculator className="h-4 w-4 text-text-faint" />} />
              <input
                type="number"
                min={1}
                value={convidadosCalc}
                onChange={(e) => setConvidadosCalc(e.target.value)}
                placeholder="Número de convidados"
                className="mb-3 w-full max-w-xs rounded-sm border border-line bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
              />
              {convidadosCalc &&
                (previsao.length === 0 ? (
                  <p className="text-sm text-text-dim">Nenhum item tem "consumo por convidado" cadastrado ainda.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {previsao.map(({ item, necessario, deficit }) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                        <span className="text-text">{item.nome}</span>
                        <span className="text-text-dim">
                          necessário <span className="font-mono text-text">{necessario}</span> {item.unidade} · tem <span className="font-mono text-text">{item.estoque_atual}</span>
                        </span>
                        {deficit > 0 ? <Badge tom="perigo" texto={`falta ${deficit} ${item.unidade}`} /> : <Badge tom="sucesso" texto="cobre a demanda" />}
                      </div>
                    ))}
                  </div>
                ))}
            </Panel>

            <Panel className="mb-4">
              <PanelHeader titulo="Novo item" desc="Cadastre bebidas, insumos, gelo ou descartáveis do galpão." />
              <ItemForm onSalvar={aoCriarItem} salvando={salvandoItem} />
            </Panel>

            <Panel>
              <PanelHeader titulo="Itens do galpão" desc={carregando ? undefined : `${itens.length} item(ns)`} />
              {carregando ? (
                <p className="text-sm text-text-dim">Carregando…</p>
              ) : itens.length === 0 ? (
                <p className="text-sm text-text-dim">Nenhum item cadastrado ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {itens.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <strong className="text-text">{item.nome}</strong>
                        <span className="ml-2 text-[11.5px] uppercase tracking-wide text-text-faint">{item.categoria}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-text-dim">
                          {item.estoque_atual} / {item.estoque_minimo} {item.unidade}
                        </span>
                        {ehCritico(item) ? <Badge tom="perigo" texto="Crítico" /> : <Badge tom="sucesso" texto="OK" />}
                        <button type="button" onClick={() => setMovimentoAberto(item)} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Movimentar
                        </button>
                        {ehCritico(item) && (
                          <button type="button" onClick={() => setCompraAberta(item)} className="rounded-sm bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-accent-ink hover:bg-accent-strong">
                            Gerar compra
                          </button>
                        )}
                        <button type="button" onClick={() => excluirItem(item.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}

        {aba === 'compras' && (
          <Panel>
            <PanelHeader titulo="Compras" desc={`${compras.length} ordem(ns) de compra`} />
            {compras.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhuma compra registrada ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {compras.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2.5 text-sm">
                    <div>
                      <strong className="text-text">{c.item?.nome ?? '—'}</strong>
                      <span className="ml-2 text-text-dim">
                        {c.quantidade} {c.item?.unidade} · {formatarMoeda(c.valor_total)} · {formatarData(c.criado_em)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tom={c.status === 'recebido' ? 'sucesso' : c.status === 'cancelado' ? 'neutro' : 'pendente'} texto={c.status === 'recebido' ? 'Recebido' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente'} />
                      {c.status === 'pendente' && (
                        <>
                          <button type="button" onClick={() => receberCompra(c).then(carregar).catch(aoFalhar)} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                            Marcar recebido
                          </button>
                          <button type="button" onClick={() => cancelarCompra(c.id).then(carregar).catch(aoFalhar)} className="text-[11.5px] font-medium text-danger hover:underline">
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {aba === 'avarias' && (
          <Panel>
            <PanelHeader titulo="Histórico de avarias" desc="Quebras e perdas registradas." />
            {avarias.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhuma avaria registrada.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {avarias.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <span className="text-text">
                      {m.item?.nome ?? '—'} — {m.quantidade} {m.item?.unidade}
                      {m.observacao ? ` · ${m.observacao}` : ''}
                    </span>
                    <span className="text-text-faint">{formatarData(m.criado_em)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {aba === 'vinculos' && (
          <Panel>
            <PanelHeader
              titulo="Vincular checklist de carga ao estoque"
              desc="Itens do checklist padrão (Logística) que ainda não apontam pra um item real do galpão — sem isso, embarcar um romaneio não desconta nada daqui."
            />
            {naoVinculados.length === 0 ? (
              <p className="text-sm text-text-dim">Tudo vinculado ✓ — nenhuma descrição do checklist padrão pendente.</p>
            ) : itens.length === 0 ? (
              <p className="text-sm text-text-dim">Cadastre pelo menos um item do galpão na aba "Itens" antes de vincular.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {naoVinculados.map((descricao) => (
                  <div key={descricao} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line bg-input px-3 py-2 text-sm">
                    <span className="text-text">{descricao}</span>
                    <select
                      disabled={vinculando === descricao}
                      defaultValue=""
                      onChange={(e) => e.target.value && aoVincular(descricao, e.target.value)}
                      className="rounded-sm border border-line bg-panel px-2 py-1 text-[12.5px] text-text outline-none focus:border-accent"
                    >
                      <option value="" disabled>
                        {vinculando === descricao ? 'Vinculando…' : 'Vincular a…'}
                      </option>
                      {itens.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </Conteudo>

      {movimentoAberto && <ModalMovimento item={movimentoAberto} onFechar={() => setMovimentoAberto(null)} onConfirmar={aoConfirmarMovimento} />}
      {compraAberta && <ModalCompra item={compraAberta} onFechar={() => setCompraAberta(null)} onConfirmar={aoConfirmarCompra} />}
    </>
  );
}
