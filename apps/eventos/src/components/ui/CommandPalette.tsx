import { ArrowDown, ArrowUp, Calendar, ClipboardCheck, CornerDownLeft, Receipt, Search, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarContratos } from '../../lib/api/contratos';
import { listarEventos } from '../../lib/api/eventos';
import { listarLeads } from '../../lib/api/leads';
import { listarOrcamentos } from '../../lib/api/orcamentos';
import { formatarData, normalizarTexto } from '../../lib/status';
import type { ContratoComLead, EventoComLead, Lead, OrcamentoCompleto } from '../../lib/types';
import { ITENS_BUSCAVEIS } from '../Layout';

type Resultado = { key: string; titulo: string; sub?: string; Icone: (typeof ITENS_BUSCAVEIS)[number]['Icone']; link: string };

/** Busca de entidades (2026-09-19, SPEC_CAMADA2 2H — "busca global
    expandida") — carregada uma única vez, lazy, no primeiro ⌘K aberto
    (não no mount do Layout inteiro: a paleta existe em toda tela
    autenticada, buscar leads/contratos/orçamentos/eventos toda vez que
    o app abre seria desperdício pra quem nunca usa ⌘K). Sem tabela nova
    — é filtro em cima do que as próprias telas de CRM/Contratos/
    Orçamentos/Agenda já carregam via essas mesmas funções de API. */
function useEntidadesBusca(aberto: boolean) {
  const [dados, setDados] = useState<{ leads: Lead[]; contratos: ContratoComLead[]; orcamentos: OrcamentoCompleto[]; eventos: EventoComLead[] } | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto || dados || carregando) return;
    setCarregando(true);
    Promise.all([listarLeads(), listarContratos(), listarOrcamentos(), listarEventos()])
      .then(([leads, contratos, orcamentos, eventos]) => setDados({ leads, contratos, orcamentos, eventos }))
      .catch(() => setDados({ leads: [], contratos: [], orcamentos: [], eventos: [] }))
      .finally(() => setCarregando(false));
  }, [aberto, dados, carregando]);

  return dados;
}

/** Busca global (Cmd/Ctrl+K) — pedido do usuário (checklist externo,
    2026-09-13), navega pros módulos da sidebar sem tirar a mão do
    teclado. Reaproveita `ITENS_BUSCAVEIS` (Layout.tsx) como fonte única
    das telas — nunca uma lista duplicada que desalinha da sidebar real.
    Montado 1x em Layout.tsx (só nas telas autenticadas, dentro do
    `<Outlet/>` protegido). A partir de 2 caracteres, também busca
    leads/contratos/orçamentos/eventos pelo nome do cliente (2026-09-19,
    "busca global expandida"). */
export function CommandPalette() {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(0);
  const navegar = useNavigate();
  const entidades = useEntidadesBusca(aberto);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberto((atual) => !atual);
        setBusca('');
        setSelecionado(0);
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const termo = busca.trim();
  const termoNormalizado = normalizarTexto(termo);

  const modulos = useMemo(() => {
    if (!termo) return ITENS_BUSCAVEIS;
    return ITENS_BUSCAVEIS.filter((i) => normalizarTexto(i.rotulo).includes(termoNormalizado));
  }, [termoNormalizado, termo]);

  // Entidades reais — só a partir de 2 caracteres (nome de 1 letra dá
  // resultado demais pra ser útil) e só quando já carregou.
  const gruposEntidade = useMemo(() => {
    if (termoNormalizado.length < 2 || !entidades) return [];
    const grupos: { titulo: string; resultados: Resultado[] }[] = [];

    const leads = entidades.leads.filter((l) => normalizarTexto(l.nome).includes(termoNormalizado)).slice(0, 5);
    if (leads.length > 0) {
      grupos.push({
        titulo: 'Clientes',
        resultados: leads.map((l) => ({ key: `lead-${l.id}`, titulo: l.nome, sub: l.telefone ?? undefined, Icone: Users, link: `/crm?lead=${l.id}` })),
      });
    }

    const contratos = entidades.contratos.filter((c) => normalizarTexto(c.lead?.nome ?? '').includes(termoNormalizado)).slice(0, 5);
    if (contratos.length > 0) {
      grupos.push({
        titulo: 'Contratos',
        resultados: contratos.map((c) => ({ key: `contrato-${c.id}`, titulo: c.lead?.nome ?? 'Contrato', sub: formatarData(c.data_evento), Icone: ClipboardCheck, link: '/contratos' })),
      });
    }

    const orcamentos = entidades.orcamentos.filter((o) => normalizarTexto(o.lead?.nome ?? '').includes(termoNormalizado)).slice(0, 5);
    if (orcamentos.length > 0) {
      grupos.push({
        titulo: 'Orçamentos',
        resultados: orcamentos.map((o) => ({ key: `orcamento-${o.id}`, titulo: o.lead?.nome ?? 'Orçamento', sub: formatarData(o.data_evento), Icone: Receipt, link: '/orcamentos' })),
      });
    }

    const eventos = entidades.eventos.filter((ev) => ev.status !== 'cancelado' && normalizarTexto(ev.contrato?.lead?.nome ?? '').includes(termoNormalizado)).slice(0, 5);
    if (eventos.length > 0) {
      grupos.push({
        titulo: 'Eventos',
        resultados: eventos.map((ev) => ({ key: `evento-${ev.id}`, titulo: ev.contrato?.lead?.nome ?? 'Evento', sub: formatarData(ev.data_evento), Icone: Calendar, link: `/eventos/${ev.id}` })),
      });
    }

    return grupos;
  }, [termoNormalizado, entidades]);

  // Lista achatada só pra navegação por teclado — módulos primeiro,
  // depois cada grupo de entidade na ordem que aparece na tela.
  const listaAchatada = useMemo(() => {
    const modulosComoResultado: Resultado[] = modulos.map((m) => ({ key: `modulo-${m.to}`, titulo: m.rotulo, Icone: m.Icone, link: m.to }));
    return [...modulosComoResultado, ...gruposEntidade.flatMap((g) => g.resultados)];
  }, [modulos, gruposEntidade]);

  useEffect(() => setSelecionado(0), [busca]);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') return setAberto(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelecionado((s) => Math.min(s + 1, listaAchatada.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelecionado((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter' && listaAchatada[selecionado]) {
        navegar(listaAchatada[selecionado].link);
        setAberto(false);
      }
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, listaAchatada, selecionado, navegar]);

  if (!aberto) return null;

  function irPara(link: string) {
    navegar(link);
    setAberto(false);
  }

  let cursor = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[14vh]" onClick={() => setAberto(false)}>
      <div className="w-full max-w-[560px] overflow-hidden rounded-lg border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-text-faint" strokeWidth={2} />
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar módulo ou cliente…"
            className="flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-text-faint"
          />
          <kbd className="flex-shrink-0 rounded-sm border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-text-faint">ESC</kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto py-1.5">
          {listaAchatada.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-text-dim">Nenhum resultado encontrado.</p>
          ) : (
            <>
              {modulos.length > 0 && (
                <div className="py-1">
                  <p className="px-4 pb-1 pt-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-text-ultra">Módulos</p>
                  {modulos.map((m) => {
                    const indice = cursor++;
                    const ativo = indice === selecionado;
                    return (
                      <div
                        key={m.to}
                        onClick={() => irPara(m.to)}
                        onMouseEnter={() => setSelecionado(indice)}
                        className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ${ativo ? 'bg-accent/10' : 'hover:bg-raised'}`}
                      >
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-icon border ${ativo ? 'border-accent/25 bg-accent/10 text-accent' : 'border-line bg-raised text-text-faint'}`}>
                          <m.Icone className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <span className={`text-[13px] font-medium ${ativo ? 'text-text' : 'text-text-dim'}`}>{m.rotulo}</span>
                        {ativo && (
                          <span className="ml-auto flex flex-shrink-0 items-center gap-1 font-mono text-[10px] text-text-faint">
                            <CornerDownLeft className="h-3 w-3" strokeWidth={2} /> abrir
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {gruposEntidade.map((grupo) => (
                <div key={grupo.titulo} className="py-1">
                  <p className="px-4 pb-1 pt-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-text-ultra">{grupo.titulo}</p>
                  {grupo.resultados.map((r) => {
                    const indice = cursor++;
                    const ativo = indice === selecionado;
                    return (
                      <div
                        key={r.key}
                        onClick={() => irPara(r.link)}
                        onMouseEnter={() => setSelecionado(indice)}
                        className={`mx-1.5 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 ${ativo ? 'bg-accent/10' : 'hover:bg-raised'}`}
                      >
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-icon border ${ativo ? 'border-accent/25 bg-accent/10 text-accent' : 'border-line bg-raised text-text-faint'}`}>
                          <r.Icone className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[13px] font-medium ${ativo ? 'text-text' : 'text-text-dim'}`}>{r.titulo}</span>
                          {r.sub && <span className="block truncate text-[11px] text-text-faint">{r.sub}</span>}
                        </span>
                        {ativo && (
                          <span className="ml-auto flex flex-shrink-0 items-center gap-1 font-mono text-[10px] text-text-faint">
                            <CornerDownLeft className="h-3 w-3" strokeWidth={2} /> abrir
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-faint">
            <ArrowUp className="h-3 w-3" strokeWidth={2} />
            <ArrowDown className="h-3 w-3" strokeWidth={2} /> navegar
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-faint">
            <CornerDownLeft className="h-3 w-3" strokeWidth={2} /> abrir
          </span>
        </div>
      </div>
    </div>
  );
}
