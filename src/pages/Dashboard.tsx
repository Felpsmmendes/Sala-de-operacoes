import { Activity, AlertTriangle, Banknote, Calendar, CheckCircle2, Clock3, Fingerprint, Lock, Package, PackageCheck, Star, Truck, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { listarAuditorias } from '../lib/api/auditoria';
import { calcularFaturamentoPorMes, diasAteEvento, listarContratos } from '../lib/api/contratos';
import { listarCuesDoEvento } from '../lib/api/cueSheet';
import { listarCompras, listarItens, type CompraComItem, type ItemEstoque } from '../lib/api/estoque';
import { listarEventos } from '../lib/api/eventos';
import { listarFunis } from '../lib/api/funis';
import { listarLeads } from '../lib/api/leads';
import { listarOrcamentoIdsComHoraAdicional } from '../lib/api/orcamentos';
import { buscarPresencaResumo } from '../lib/api/ponto';
import { AlertaBanner } from '../components/AlertaBanner';
import { Badge } from '../components/Badge';
import { Cabecalho, Conteudo } from '../components/Layout';
import { GraficoDonut } from '../components/charts/GraficoDonut';
import { MetricCard } from '../components/MetricCard';
import { Panel, PanelHeader } from '../components/Panel';
import { Skeleton } from '../components/Skeleton';
import { EstadoVazio } from '../components/ui/EmptyState';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Reveal } from '../components/ui/Reveal';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { useNotificacoes } from '../lib/NotificacoesContext';
import { carregarAlertaSatisfacaoNota } from '../lib/configAlertas';
import { toast } from '../lib/toast';
import { calcularStaffNecessario, funcaoContaComo } from '../lib/staffing';
import { STATUS_EVENTO_INFO, formatarData, formatarMoeda } from '../lib/status';
import type { AuditoriaPosEvento, ContratoComLead, CueSheetItem, EscalaPresenca, EventoComLead, FunilLead, Lead } from '../lib/types';

function tempoRelativoAtividade(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Granularidade de segundos (2026-09-18, REVIEW_DECISOES_V2 Parte 6/01)
    — diferente de `tempoRelativoAtividade` acima (que começa em "0 min"),
    esta é pro indicador "Atualizado há Xs" do monitor ao vivo, onde o
    refresh é de 60 em 60s — sem segundos, ficaria preso em "0 min" quase
    sempre. */
function tempoRelativoSegundos(d: Date): string {
  const seg = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seg < 60) return `${seg}s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h`;
}

type Atividade = { texto: string; sub: string; quando: Date; link: string; cor: string };

/** "Atividades recentes" (2026-09-17, "master redesign") — nunca um feed
    de eventos gravado à parte (isso seria uma tabela de auditoria nova,
    proibida pelas regras do prompt); é só um reordenar dos MESMOS
    `contratos`/`leads` que o Dashboard já carrega, pelos campos
    `atualizado_em` que já existem. */
function AtividadesRecentes({ contratos, leads }: { contratos: ContratoComLead[]; leads: Lead[] }) {
  const atividades: Atividade[] = [];

  [...contratos]
    .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
    .slice(0, 3)
    .forEach((c) =>
      atividades.push({
        texto: c.saldo_status === 'quitado' ? 'Contrato quitado' : 'Contrato atualizado',
        sub: `${c.lead?.nome ?? '—'} · ${formatarMoeda(c.valor_total)}`,
        quando: new Date(c.atualizado_em),
        link: '/contratos',
        cor: 'text-money',
      })
    );

  [...leads]
    .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))
    .slice(0, 2)
    .forEach((l) =>
      atividades.push({
        texto: 'Lead atualizado',
        sub: `${l.nome}${l.valor_estimado ? ` · ${formatarMoeda(l.valor_estimado)}` : ''}`,
        quando: new Date(l.atualizado_em),
        link: '/crm',
        cor: 'text-people',
      })
    );

  const ordenadas = atividades.sort((a, b) => b.quando.getTime() - a.quando.getTime()).slice(0, 5);
  if (ordenadas.length === 0) return null;

  return (
    <Panel className="mb-4">
      <PanelHeader titulo="Atividades recentes" desc="Últimas ações no sistema" />
      <div className="flex flex-col divide-y divide-line">
        {ordenadas.map((a, i) => (
          <Link key={i} to={a.link} className="flex items-center gap-3 py-2.5 transition-colors hover:text-text">
            <div className={`h-2 w-2 flex-shrink-0 rounded-full ${a.cor.replace('text-', 'bg-')}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] font-semibold ${a.cor}`}>{a.texto}</p>
              <p className="text-[11.5px] text-text-dim">{a.sub}</p>
            </div>
            <span className="flex-shrink-0 font-mono text-[10px] text-text-ultra">{tempoRelativoAtividade(a.quando)}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

/** % do evento já passado, só pra evento "em_execucao" hoje (2026-09-16,
    "redesign visual" do usuário) — mesma correção de "virou a
    madrugada" já usada em `calcularHoraExtra` (escalas.ts): se o fim
    previsto é numericamente menor que o início (ex. 20:00 → 02:00),
    soma 24h nele antes de comparar. `null` quando falta início ou fim
    previsto (não dá pra calcular sem os dois). */
function progressoTemporalEvento(horaInicio: string | null, horaFimPrevista: string | null): number | null {
  if (!horaInicio || !horaFimPrevista) return null;
  const paraMinutos = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };
  const agora = new Date();
  const inicio = paraMinutos(horaInicio);
  let fim = paraMinutos(horaFimPrevista);
  let atual = agora.getHours() * 60 + agora.getMinutes();
  if (fim < inicio) fim += 24 * 60;
  if (atual < inicio) atual += 24 * 60; // já viramos o dia, mas o evento é "de ontem"
  const total = fim - inicio;
  if (total <= 0) return null;
  return Math.max(0, Math.min(100, ((atual - inicio) / total) * 100));
}

const SALDO_INFO: Record<string, { rotulo: string; tom: 'sucesso' | 'pendente' | 'perigo' }> = {
  quitado: { rotulo: 'Saldo quitado', tom: 'sucesso' },
  parcial: { rotulo: 'Saldo parcial', tom: 'pendente' },
  pendente: { rotulo: 'Saldo pendente', tom: 'perigo' },
};

/* Link "ver mais" de cada painel — recolorido por categoria do DESTINO
   (2026-09-09, auditoria do usuário: era um único hover:text-accent pra
   links que apontam pra seções bem diferentes — dinheiro, pessoas,
   operação). Base compartilhada + 1 variante por categoria usada aqui. */
const linkPainelBase = 'flex items-center gap-1 text-[12px] font-medium text-text-dim transition-colors';
const linkPainelPessoas = `${linkPainelBase} hover:text-people`;
const linkPainelOperacao = `${linkPainelBase} hover:text-ops`;

export default function Dashboard() {
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [contratos, setContratos] = useState<ContratoComLead[]>([]);
  const [presenca, setPresenca] = useState<EscalaPresenca[]>([]);
  const [funis, setFunis] = useState<FunilLead[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
  const [orcamentosComHoraExtra, setOrcamentosComHoraExtra] = useState<Set<string>>(new Set());
  const [compras, setCompras] = useState<CompraComItem[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaPosEvento[]>([]);
  const [cuesPorEvento, setCuesPorEvento] = useState<Map<string, CueSheetItem[]>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // "Atualizado há Xs" (2026-09-18, REVIEW_DECISOES_V2 Parte 6/01) — a
  // hora do último `buscarTudo` bem-sucedido; `tick` só existe pra forçar
  // rerender a cada 5s (o próprio valor nunca é lido), senão o texto
  // relativo ficaria congelado no número calculado no momento do fetch.
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 5_000);
    return () => window.clearInterval(id);
  }, []);

  // "Monitor ao vivo": pensado pra ficar aberto numa tela fixa na sala de
  // operações o dia todo, então buscar só uma vez no mount não basta — o
  // dado ficaria parado até alguém recarregar a página na mão. Recarrega
  // sozinho a cada 60s e sempre que a aba volta a ficar visível (mesmo
  // padrão de "acordar" já usado em AuthContext pro refresh de sessão).
  // `mostraCarregando` só liga o "Carregando…" na primeira busca — nas
  // seguintes o conteúdo antigo continua na tela até o novo chegar, sem
  // piscar a cada minuto.
  useEffect(() => {
    let cancelado = false;

    async function buscarTudo(mostraCarregando: boolean) {
      if (mostraCarregando) setCarregando(true);
      setErro(null);
      try {
        // as 4 primeiras não dependem de nada — vão juntas na mesma
        // leva. Presença de hoje só dá pra buscar depois de saber quais
        // eventos são de hoje (idsHoje), por isso fica numa segunda leva.
        const [ev, ct, fs, ls, itens, comHoraExtra, cp, aud] = await Promise.all([
          listarEventos(),
          listarContratos(),
          listarFunis(),
          listarLeads(),
          listarItens(),
          listarOrcamentoIdsComHoraAdicional(),
          listarCompras(),
          listarAuditorias(),
        ]);
        const hoje = new Date().toISOString().slice(0, 10);
        const idsHoje = ev.filter((e) => e.data_evento === hoje && e.status !== 'cancelado').map((e) => e.id);
        // roteiro (cue sheet) de cada evento de hoje — pra mostrar em que
        // fase a operação está e qual a próxima transição de horário no
        // card do "Monitor ao vivo". Só leitura (nunca sincroniza cues
        // automáticos daqui — isso é ação do Roteiro do Evento).
        const [pres, cuesArrays] = await Promise.all([
          buscarPresencaResumo(idsHoje),
          Promise.all(idsHoje.map((id) => listarCuesDoEvento(id).catch(() => []))),
        ]);
        if (cancelado) return;
        setEventos(ev);
        setContratos(ct);
        setPresenca(pres);
        setCuesPorEvento(new Map(idsHoje.map((id, i) => [id, cuesArrays[i]])));
        setFunis(fs);
        setLeads(ls);
        setItensEstoque(itens);
        setOrcamentosComHoraExtra(comHoraExtra);
        setCompras(cp);
        setAuditorias(aud);
        setUltimaAtualizacao(new Date());
      } catch (e) {
        if (!cancelado) setErro(mensagemDeErro(e));
      } finally {
        if (!cancelado && mostraCarregando) setCarregando(false);
      }
    }

    buscarTudo(true);
    const intervalo = window.setInterval(() => buscarTudo(false), 60_000);
    function aoVoltarVisivel() {
      if (document.visibilityState === 'visible') buscarTudo(false);
    }
    document.addEventListener('visibilitychange', aoVoltarVisivel);
    window.addEventListener('focus', aoVoltarVisivel);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltarVisivel);
      window.removeEventListener('focus', aoVoltarVisivel);
    };
  }, []);

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const mesAnterior = useMemo(() => {
    const d = new Date(hoje + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 7);
  }, [hoje]);

  const eventosHoje = useMemo(() => eventos.filter((e) => e.data_evento === hoje && e.status !== 'cancelado').sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')), [eventos, hoje]);

  // clientes insatisfeitos (pedido do usuário, 2026-09-09) — mesmo corte
  // de "Após o Evento" (nota NPS 0-4), só os últimos 30 dias pra não
  // ressuscitar reclamação antiga pra sempre no topo do Dashboard.
  const eventoPorId = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);
  // Threshold configurável em Configurações > Operacional (REVIEW_DECISOES_V2
  // Parte 14/16, P2) — lido 1x por render, não precisa reagir a mudança
  // ao vivo (só muda quando o gestor salva a config e a página recarrega).
  const alertaSatisfacaoNota = carregarAlertaSatisfacaoNota();
  const clientesInsatisfeitos = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const limiteStr = limite.toISOString().slice(0, 10);
    return auditorias
      .filter((a) => a.nps_nota != null && a.nps_nota <= alertaSatisfacaoNota && a.criado_em.slice(0, 10) >= limiteStr)
      .map((a) => ({ auditoria: a, evento: eventoPorId.get(a.evento_id) ?? null }))
      .sort((a, b) => b.auditoria.criado_em.localeCompare(a.auditoria.criado_em));
  }, [auditorias, eventoPorId, alertaSatisfacaoNota]);
  const proximosEventos = useMemo(() => eventos.filter((e) => e.data_evento > hoje && e.status !== 'cancelado').slice(0, 6), [eventos, hoje]);

  const faturamentoMes = useMemo(() => contratos.filter((c) => c.data_evento.slice(0, 7) === mesAtual && c.status !== 'cancelado').reduce((s, c) => s + c.valor_total, 0), [contratos, mesAtual]);
  // comparação real (não fabricada) pro selo de tendência do card — mesmo
  // recorte de "contratos com evento no mês", só do mês anterior.
  const faturamentoMesAnterior = useMemo(
    () => contratos.filter((c) => c.data_evento.slice(0, 7) === mesAnterior && c.status !== 'cancelado').reduce((s, c) => s + c.valor_total, 0),
    [contratos, mesAnterior]
  );
  const tendenciaFaturamentoMes = faturamentoMesAnterior > 0 ? { percentual: ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior) * 100, positivo: faturamentoMes >= faturamentoMesAnterior } : null;

  const contratoPorId = useMemo(() => new Map(contratos.map((c) => [c.id, c])), [contratos]);
  const presencaPorEvento = useMemo(() => {
    const mapa = new Map<string, EscalaPresenca[]>();
    for (const p of presenca) mapa.set(p.evento_id, [...(mapa.get(p.evento_id) ?? []), p]);
    return mapa;
  }, [presenca]);
  const totalConfirmadosHoje = presenca.filter((p) => p.status_escala === 'confirmado').length;

  // cobertura por função hoje (bartender/barback) — mesma regra de
  // dimensionamento da Escala (calcularStaffNecessario), somada nos
  // eventos de hoje, comparada com quem já está escalado (recusado não
  // conta como cobertura).
  const coberturaFuncaoHoje = useMemo(() => {
    const necessario = eventosHoje.reduce(
      (acc, ev) => {
        const r = calcularStaffNecessario(ev.convidados);
        return { bartender: acc.bartender + r.bartender, barback: acc.barback + r.barback };
      },
      { bartender: 0, barback: 0 }
    );
    const ativos = presenca.filter((p) => p.status_escala !== 'recusado');
    return {
      necessario,
      bartender: ativos.filter((p) => funcaoContaComo(p.membro_funcao) === 'bartender').length,
      barback: ativos.filter((p) => funcaoContaComo(p.membro_funcao) === 'barback').length,
    };
  }, [eventosHoje, presenca]);

  const contratosEmRisco = useMemo(
    () => contratos.filter((c) => c.status !== 'cancelado' && c.saldo_status !== 'quitado' && diasAteEvento(c.data_evento) <= 20).length,
    [contratos]
  );
  const itensCriticos = useMemo(() => itensEstoque.filter((i) => i.estoque_atual <= i.estoque_minimo).length, [itensEstoque]);

  // "Trava D-15" (mesmo conceito já usado no Portal do Cliente — ver
  // PortalClienteAdmin/PortalClientePublico: diasAteEvento < 15 trava
  // edição do cliente) — aqui aplicado ao saldo: contrato ativo com
  // evento em até 15 dias e saldo ainda não quitado é um valor "travado"
  // (risco de liquidez), o resto já está "liberado" na tesouraria.
  const travaD15 = useMemo(() => {
    const naJanela = contratos.filter((c) => c.status !== 'cancelado' && diasAteEvento(c.data_evento) <= 15 && diasAteEvento(c.data_evento) >= 0);
    const travados = naJanela.filter((c) => c.saldo_status !== 'quitado').length;
    return { total: naJanela.length, travados, liberados: naJanela.length - travados };
  }, [contratos]);

  // pontos de atenção reais (nunca fabricados) pra resumir "tá tudo ok?"
  // no topo da tela — mesmos 3 sinais que já geram alerta em outro lugar
  // da própria tela (estoque crítico, contrato em risco, NPS baixo).
  const pontosDeAtencao = itensCriticos + contratosEmRisco + clientesInsatisfeitos.length;

  // banner de risco operacional (2026-09-14) — "N pontos de atenção" acima
  // já avisa que tem problema, mas não diz QUAL evento nem dá o caminho
  // pra resolver. Aqui é o recorte acionável: só os próximos 7 dias (janela
  // que ainda dá tempo de agir), por evento, com link direto pro módulo
  // certo — saldo em aberto → Contratos, sem ninguém escalado → Escala.
  const eventosComPendencia = useMemo(() => {
    const em7dias = new Date();
    em7dias.setDate(em7dias.getDate() + 7);
    const limite = em7dias.toISOString().slice(0, 10);
    return eventos
      .filter((ev) => ev.status !== 'cancelado' && ev.data_evento >= hoje && ev.data_evento <= limite)
      .map((ev) => {
        const contrato = contratoPorId.get(ev.contrato_id);
        const pendencias: string[] = [];
        if (contrato && contrato.saldo_status !== 'quitado') pendencias.push('saldo em aberto');
        if ((presencaPorEvento.get(ev.id) ?? []).length === 0) pendencias.push('sem equipe escalada');
        return { ev, pendencias };
      })
      .filter(({ pendencias }) => pendencias.length > 0)
      .sort((a, b) => a.ev.data_evento.localeCompare(b.ev.data_evento));
  }, [eventos, contratoPorId, presencaPorEvento, hoje]);

  // Leads esfriando (>7 dias sem contato) pro sino de notificações
  // (2026-09-17, "topbar + notificações") — MESMA regra do CRM (Crm.tsx):
  // `papel == null` (etapa do meio do funil), nunca uma lista fixa de
  // status como 'fechado'/'perdido' — o status de um lead é o id
  // dinâmico da etapa do funil, não uma palavra fixa, então checar contra
  // string literal nunca bateria com nada de verdade.
  const funisPorId = useMemo(() => new Map(funis.map((f) => [f.id, f])), [funis]);
  const leadsEsfriandoGlobal = useMemo(() => {
    const limite = 7 * 86_400_000;
    return leads.filter((l) => funisPorId.get(l.status)?.papel == null && Date.now() - new Date(l.atualizado_em).getTime() >= limite);
  }, [leads, funisPorId]);

  const sinaisPendentesGlobal = useMemo(() => contratos.filter((c) => c.status === 'ativo' && !c.sinal_pago), [contratos]);

  // Alimenta o sino de notificações (topbar) — dedupe por título já
  // acontece dentro do próprio `adicionarNotificacao` (ver
  // NotificacoesContext), então rodar de novo a cada recarregamento
  // (60s) não duplica nada.
  const { adicionarNotificacao } = useNotificacoes();
  useEffect(() => {
    if (carregando) return;

    eventosComPendencia.forEach(({ ev, pendencias }) => {
      const nomeCliente = ev.contrato?.lead?.nome ?? 'Evento';
      const dias = diasAteEvento(ev.data_evento);
      if (pendencias.includes('saldo em aberto')) {
        adicionarNotificacao({ tom: 'perigo', titulo: `D-${dias}: saldo pendente — ${nomeCliente}`, descricao: formatarData(ev.data_evento), link: '/contratos' });
      }
      if (pendencias.includes('sem equipe escalada')) {
        adicionarNotificacao({ tom: 'pendente', titulo: `Sem equipe: ${nomeCliente}`, descricao: formatarData(ev.data_evento), link: '/escala' });
      }
    });

    itensEstoque
      .filter((i) => i.estoque_atual <= i.estoque_minimo)
      .forEach((item) => {
        adicionarNotificacao({ tom: 'perigo', titulo: `Estoque crítico: ${item.nome}`, descricao: `${item.estoque_atual} ${item.unidade} (mín. ${item.estoque_minimo})`, link: '/estoque' });
      });

    leadsEsfriandoGlobal.forEach((lead) => {
      const dias = Math.floor((Date.now() - new Date(lead.atualizado_em).getTime()) / 86_400_000);
      adicionarNotificacao({ tom: 'neutro', titulo: `Lead esfriando: ${lead.nome}`, descricao: `${dias} dias sem contato`, link: '/crm' });
    });

    sinaisPendentesGlobal.forEach((c) => {
      adicionarNotificacao({ tom: 'pendente', titulo: `Sinal pendente — ${c.lead?.nome ?? 'Contrato'}`, descricao: formatarMoeda(c.valor_sinal), link: '/contratos' });
    });

    clientesInsatisfeitos.forEach(({ auditoria, evento }) => {
      adicionarNotificacao({ tom: 'perigo', titulo: `Nota baixa: ${evento?.contrato?.lead?.nome ?? 'cliente'}`, descricao: `Nota ${auditoria.nps_nota}`, link: '/auditoria' });
    });
  }, [carregando, eventosComPendencia, itensEstoque, leadsEsfriandoGlobal, sinaisPendentesGlobal, clientesInsatisfeitos, adicionarNotificacao]);

  function copiarLinkDrinks(eventoId: string) {
    const link = `${window.location.origin}/drinks/${eventoId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.sucesso('Link do contador de drinks copiado — manda pro celular de quem vai tocar no posto.'))
      .catch(() => toast.aviso('Não foi possível copiar automaticamente. Link: ' + link));
  }

  // "faturamento contratado" por mês (pedido do usuário, 2026-09-09) —
  // função compartilhada (ver calcularFaturamentoPorMes em api/contratos.ts),
  // reaproveitada em Fechamento sem duplicar a lógica; alimenta só o
  // histórico (sparkline) do card "Faturamento do mês" no MetricGrid.
  const faturamentoPorMes = useMemo(() => calcularFaturamentoPorMes(contratos, 6), [contratos]);

  // "Compras chegando" (pedido do usuário) — pendentes com previsão pra
  // hoje ou pros próximos 7 dias, puxando de compras.data_chegada_prevista.
  const comprasChegando = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const limite = new Date();
    limite.setDate(limite.getDate() + 7);
    const limiteStr = limite.toISOString().slice(0, 10);
    const pendentesComPrevisao = compras.filter((c) => c.status === 'pendente' && c.data_chegada_prevista);
    const hojeCount = pendentesComPrevisao.filter((c) => c.data_chegada_prevista === hojeStr).length;
    const semanaCount = pendentesComPrevisao.filter((c) => (c.data_chegada_prevista as string) >= hojeStr && (c.data_chegada_prevista as string) <= limiteStr).length;
    return { hojeCount, semanaCount };
  }, [compras]);

  return (
    <>
      <Cabecalho titulo="Dashboard" subtitulo="Visão geral do negócio + monitor ao vivo dos eventos de hoje e cobertura de equipe." />
      <Conteudo>
        {/* banner "evento ao vivo" (checklist externo, 2026-09-13) — só
            aparece quando tem evento rolando hoje, pra chamar atenção pro
            monitor ao vivo logo abaixo sem duplicar o resumo neutro da
            linha seguinte. */}
        {!carregando && eventosHoje.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-md border border-execucao/25 bg-execucao/10 px-4 py-2.5">
            {/* anel duplo (2026-09-15) em vez do `DotLive` simples — só
                aqui, é o único estado mais crítico do sistema ("tem gente
                agora mesmo num evento"), merece se destacar mais que o
                pulso padrão usado em todo resto. */}
            <span className="pulso-anel" style={{ '--pulso-cor': 'var(--color-execucao)' } as CSSProperties} title="Ao vivo" />
            <span className="text-[13px] font-semibold text-execucao">
              {eventosHoje.length} evento{eventosHoje.length > 1 ? 's' : ''} acontecendo agora
            </span>
            <span className="text-[12px] text-text-dim">— monitor ao vivo abaixo</span>
          </div>
        )}

        {/* banner de risco operacional (2026-09-14) — pendências dos
            próximos 7 dias, uma linha por evento, com link direto pro
            módulo que resolve. Só aparece quando há algo de fato pendente
            (nunca lista evento sem problema, mesmo padrão de "nunca
            fabricar sinal" do resto do Dashboard). */}
        {!carregando && eventosComPendencia.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-sm border border-danger/30 bg-danger/8">
            <div className="flex items-center gap-3 border-b border-danger/20 px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger" strokeWidth={2} />
              <p className="text-[13px] font-semibold text-danger">
                {eventosComPendencia.length === 1 ? '1 evento nos próximos 7 dias com pendências' : `${eventosComPendencia.length} eventos nos próximos 7 dias com pendências`}
              </p>
            </div>
            <div className="flex flex-col gap-1 px-4 py-2">
              {eventosComPendencia.map(({ ev, pendencias }) => (
                <div key={ev.id} className="flex flex-wrap items-center gap-2 py-1 text-[12.5px]">
                  <span className="flex-shrink-0 font-mono text-text-faint">{formatarData(ev.data_evento)}</span>
                  <Link to={`/eventos/${ev.id}`} className="min-w-0 truncate font-medium text-text hover:text-accent hover:underline">
                    {ev.contrato?.lead?.nome ?? 'Evento sem nome'}
                  </Link>
                  <span className="flex-shrink-0 text-text-faint">—</span>
                  <span className="min-w-0 truncate text-danger">{pendencias.join(', ')}</span>
                  <div className="ml-auto flex flex-shrink-0 gap-2">
                    {pendencias.includes('saldo em aberto') && (
                      <Link to="/contratos" className="rounded-sm border border-line px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:bg-raised hover:text-text">
                        Contratos →
                      </Link>
                    )}
                    {pendencias.includes('sem equipe escalada') && (
                      <Link to="/escala" className="rounded-sm border border-line px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:bg-raised hover:text-text">
                        Escala →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado global (2026-09-18, REVIEW_DECISOES_V2 Parte 6/01) — o
            "● Operação normal"/"⚠ N itens" do topo do Dashboard, P1 do
            review. Reaproveita `pontosDeAtencao` (2026-09-10, "continue o
            design") — nunca um "tudo ok" fabricado: só fica verde quando
            os 3 sinais que já geram alerta no resto da tela (estoque
            crítico, contrato em risco, nota baixa) estão todos zerados.
            "Atualizado há Xs" ao lado — mesmo padrão de "nunca esconder
            que o monitor pode estar defasado" do resto do sistema. */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-text-dim">
          {pontosDeAtencao === 0 ? (
            <span className="flex items-center gap-1.5 font-semibold text-success">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success" /> Operação normal
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-semibold text-pending">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              {pontosDeAtencao} {pontosDeAtencao === 1 ? 'item precisa' : 'itens precisam'} de atenção
            </span>
          )}
          <span className="text-text-ultra">·</span>
          <span>
            <strong className="font-mono text-text">{eventosHoje.length}</strong> evento{eventosHoje.length === 1 ? '' : 's'} acontecendo hoje
          </span>
          <span className="text-text-ultra">·</span>
          <span>
            <strong className="font-mono text-text">{totalConfirmadosHoje}</strong> de {presenca.length} escalados confirmados
          </span>
          {ultimaAtualizacao && (
            <>
              <span className="ml-auto text-text-ultra">·</span>
              <span className="font-mono text-[11px] text-text-ultra">Atualizado há {tempoRelativoSegundos(ultimaAtualizacao)}</span>
            </>
          )}
        </div>

        <section className="metric-grid mb-4 grid grid-flow-dense grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          <MetricCard Icone={Calendar} rotulo="Eventos hoje" valor={String(eventosHoje.length)} legenda={formatarData(hoje)} categoria="agenda" aoVivo />
          <MetricCard
            Icone={Banknote}
            rotulo="Faturamento do mês"
            valor={formatarMoeda(faturamentoMes)}
            legenda="Soma de contratos ativos no mês"
            tendencia={tendenciaFaturamentoMes ?? undefined}
            categoria="dinheiro"
            historico={faturamentoPorMes.map((m) => m.valor)}
            valorAnimado={{ alvo: faturamentoMes, formatar: formatarMoeda }}
          />
          <MetricCard Icone={Users} rotulo="Equipe confirmada hoje" valor={String(totalConfirmadosHoje)} legenda={`de ${presenca.length} escalados`} categoria="pessoas" aoVivo />
          <MetricCard Icone={AlertTriangle} rotulo="Contratos em risco D-20" valor={String(contratosEmRisco)} legenda="Saldo pendente, evento em ≤20 dias" categoria="dinheiro" comoLink="/contratos" />
          <MetricCard Icone={Package} rotulo="Estoque em nível crítico" valor={String(itensCriticos)} legenda="Itens abaixo do mínimo" categoria="operacao" comoLink="/estoque" />
          <MetricCard
            Icone={Lock}
            rotulo="Trava D-15"
            valor={String(travaD15.travados)}
            legenda={travaD15.total === 0 ? 'Nenhum contrato na janela' : `${travaD15.liberados} de ${travaD15.total} já liberado(s) (saldo quitado)`}
            categoria="dinheiro"
            comoLink="/contratos"
          />
        </section>

        {erro && <AlertaBanner tom="perigo" className="mb-4">{erro}</AlertaBanner>}

        {clientesInsatisfeitos.length > 0 && (
          <AlertaBanner tom="perigo" Icone={Star} titulo={`${clientesInsatisfeitos.length} cliente(s) insatisfeito(s) nos últimos 30 dias`} className="mb-4">
            <ul className="flex flex-col gap-1 pl-5 text-[12.5px] list-disc">
              {clientesInsatisfeitos.map(({ auditoria, evento }) => (
                <li key={auditoria.evento_id}>
                  <Link to={`/auditoria?evento=${auditoria.evento_id}`} className="hover:underline">
                    {evento?.contrato?.lead?.nome ?? 'Evento'} — nota {auditoria.nps_nota}
                    {auditoria.nps_comentario && <span className="text-danger/80"> · "{auditoria.nps_comentario}"</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </AlertaBanner>
        )}

        {/* Painel de Pendências (2026-09-17, "master redesign") — resumo
            clicável dos mesmos sinais que já alimentam o sino/badge, só
            que reunidos numa faixa só, pra pular direto pro módulo certo
            sem precisar caçar cada número espalhado pela tela. */}
        {!carregando && (
          <Panel className="mb-4">
            <PanelHeader
              titulo="Pendências"
              desc="Itens que precisam de ação"
              acao={
                pontosDeAtencao === 0 ? (
                  <span className="flex items-center gap-1.5 text-[12px] text-execucao">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Tudo em dia
                  </span>
                ) : null
              }
            />
            {pontosDeAtencao > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { n: contratosEmRisco, label: 'Contratos D-20', link: '/contratos' },
                  { n: sinaisPendentesGlobal.length, label: 'Sinais pendentes', link: '/contratos' },
                  { n: itensCriticos, label: 'Estoque crítico', link: '/estoque' },
                  { n: eventosComPendencia.length, label: 'Eventos c/ pendência', link: '/agenda' },
                  { n: clientesInsatisfeitos.length, label: 'Nota baixa', link: '/auditoria' },
                ]
                  .filter((item) => item.n > 0)
                  .map((item) => (
                    <Link key={item.label} to={item.link} className="flex items-center gap-2.5 rounded-md border border-danger/25 bg-danger/8 px-3 py-2.5 transition-colors hover:border-line-strong">
                      <span className="font-mono text-[20px] font-black leading-none text-danger">{item.n}</span>
                      <span className="text-[11.5px] font-medium text-text-dim">{item.label}</span>
                    </Link>
                  ))}
              </div>
            )}
          </Panel>
        )}

        {/* Atividades Recentes — derivadas dos mesmos dados já carregados
            (contratos/leads), sem nenhuma tabela nova. */}
        {!carregando && <AtividadesRecentes contratos={contratos} leads={leads} />}

        <Reveal className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Panel>
            <PanelHeader
              titulo="Monitor ao vivo"
              desc={carregando ? undefined : eventosHoje.length === 0 ? 'Nenhum evento hoje' : `${eventosHoje.length} evento(s) hoje`}
              acao={<Activity className="h-4 w-4 text-text-faint" />}
            />

            {carregando ? (
              // Skeleton (DESIGN.md > Motion, 2026-09-09) no formato
              // aproximado de 2 cards de evento, no lugar do texto puro.
              <div className="flex flex-col gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-lg border border-line bg-input p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <Skeleton w="140px" h="15px" />
                      <Skeleton w="70px" h="20px" className="rounded-full" />
                    </div>
                    <Skeleton h="52px" className="mb-3" />
                    <Skeleton w="60%" h="22px" />
                  </div>
                ))}
              </div>
            ) : eventosHoje.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhum evento hoje. {proximosEventos[0] ? `Próximo: ${formatarData(proximosEventos[0].data_evento)} — ${proximosEventos[0].contrato?.lead?.nome ?? 'sem nome'}.` : ''}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eventosHoje.map((ev) => {
                  const contrato = ev.contrato ? contratoPorId.get(ev.contrato.id) : null;
                  const escalados = presencaPorEvento.get(ev.id) ?? [];
                  const confirmados = escalados.filter((p) => p.status_escala === 'confirmado').length;
                  const temHoraExtra = !!ev.contrato?.orcamento_id && orcamentosComHoraExtra.has(ev.contrato.orcamento_id);
                  return (
                    <article key={ev.id} className="rounded-lg border border-line bg-input p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link to={`/eventos/${ev.id}`} className="block truncate text-[15px] font-semibold text-text hover:text-accent hover:underline">
                            {ev.contrato?.lead?.nome ?? 'Evento sem nome'}
                          </Link>
                          <p className="truncate text-[12.5px] text-text-dim" title={ev.local || 'local não informado'}>
                            {ev.local || 'local não informado'}
                          </p>
                        </div>
                        <Badge tom={STATUS_EVENTO_INFO[ev.status].tom} texto={STATUS_EVENTO_INFO[ev.status].rotulo} />
                      </div>

                      <div className="mb-3 grid grid-cols-3 gap-3 rounded-sm bg-panel px-3 py-2.5">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Início</span>
                          <span className="font-mono text-[12.5px] text-text">{ev.hora_inicio?.slice(0, 5) || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Canal rádio</span>
                          <span className="font-mono text-[12.5px] text-pending">{ev.canal_radio || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-text-faint">Convidados</span>
                          <span className="font-mono text-[12.5px] text-text">{ev.convidados ?? '—'}</span>
                        </div>
                      </div>

                      {ev.status === 'em_execucao' &&
                        (() => {
                          const pct = progressoTemporalEvento(ev.hora_inicio, ev.hora_fim_prevista);
                          if (pct == null) return null;
                          return (
                            <div className="mb-3">
                              <div className="mb-1 flex items-center justify-between text-[10px] text-text-faint">
                                <span className="font-mono">{ev.hora_inicio?.slice(0, 5)}</span>
                                <span className="font-semibold text-execucao">{Math.round(pct)}% do evento</span>
                                <span className="font-mono">{ev.hora_fim_prevista?.slice(0, 5)}</span>
                              </div>
                              <ProgressBar valor={pct} categoria="execucao" glow />
                            </div>
                          );
                        })()}

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {contrato && <Badge tom={SALDO_INFO[contrato.saldo_status].tom} texto={SALDO_INFO[contrato.saldo_status].rotulo} />}
                        <Badge tom={confirmados === escalados.length && escalados.length > 0 ? 'sucesso' : 'pendente'} texto={`Equipe ${confirmados}/${escalados.length}`} />
                        {temHoraExtra && (
                          <span className="flex items-center gap-1 rounded-full border border-pending/25 bg-pending/15 px-2.5 py-1 text-[11px] font-semibold text-pending">
                            <Clock3 className="h-2.5 w-2.5" strokeWidth={2.5} /> Tem horas adicionais
                          </span>
                        )}
                      </div>

                      {(() => {
                        // roteiro do evento (CueSheet) — mesma fonte que a
                        // tela Roteiro do Evento usa, só leitura aqui.
                        const cues = cuesPorEvento.get(ev.id) ?? [];
                        if (cues.length === 0) return null;
                        const concluidos = cues.filter((c) => c.concluido).length;
                        const proxima = cues.find((c) => !c.concluido);
                        return (
                          <div className="mb-3">
                            <div className="mb-1 flex items-center justify-between text-[10.5px] text-text-faint">
                              <span>
                                Roteiro: {concluidos}/{cues.length} etapas
                              </span>
                              {proxima && <span className="font-mono text-pending">próxima {proxima.horario.slice(0, 5)}</span>}
                            </div>
                            <ProgressBar valor={(concluidos / cues.length) * 100} categoria="agenda" glow />
                            {proxima && <p className="mt-1 text-[11px] text-text-dim">Próxima transição: {proxima.titulo}</p>}
                          </div>
                        );
                      })()}

                      <div className="flex flex-wrap gap-2">
                        <Link to={`/roteiro?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Roteiro
                        </Link>
                        <Link to={`/escala?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Escala
                        </Link>
                        <Link to="/logistica" className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Logística
                        </Link>
                        <Link to={`/ponto?evento=${ev.id}`} className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text">
                          Ponto
                        </Link>
                        <button
                          type="button"
                          onClick={() => copiarLinkDrinks(ev.id)}
                          className="rounded-sm border border-line px-2.5 py-1 text-[11.5px] text-text-dim hover:bg-raised hover:text-text"
                        >
                          Copiar link do contador de drinks
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-4">
            {/* "Cobertura de equipe hoje" (2026-09-19, "reorganização do
                Dashboard") — movida pra cá da antiga faixa de 3 painéis
                (funil/cobertura/financeiro), que saiu do Dashboard porque
                cada um dos outros dois já tem tela própria (CRM,
                Financeiro). Cobertura fica: é o único dos 3 que resume
                "o monitor de hoje", o mesmo assunto do Monitor ao vivo
                ao lado. */}
            <Panel>
              <PanelHeader
                titulo="Cobertura de equipe hoje"
                acao={
                  <Link to="/escala" className={linkPainelPessoas}>
                    Ver escala <Users className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              {presenca.length === 0 ? (
                <EstadoVazio Icone={Users} titulo="Ninguém escalado pra hoje" />
              ) : (
                <>
                  <strong className="block font-mono text-3xl font-semibold text-text">{totalConfirmadosHoje}</strong>
                  <span className="mb-3 block text-[12.5px] text-text-dim">confirmados de {presenca.length} escalados</span>
                  <GraficoDonut
                    centroRotulo="Escalados"
                    fatias={[
                      { rotulo: 'Confirmado', valor: presenca.filter((p) => p.status_escala === 'confirmado').length, corClasse: 'text-success' },
                      { rotulo: 'Convocado', valor: presenca.filter((p) => p.status_escala === 'convocado').length, corClasse: 'text-pending' },
                      { rotulo: 'Recusado', valor: presenca.filter((p) => p.status_escala === 'recusado').length, corClasse: 'text-danger' },
                    ]}
                  />

                  {/* cobertura por função (pedido do usuário, "continue o
                      design") — mesma regra de dimensionamento da Escala
                      (calcularStaffNecessario), aplicada aos eventos de hoje. */}
                  <div className="mt-4 flex flex-col gap-2.5 border-t border-line pt-3">
                    <div>
                      <div className="mb-1 flex justify-between text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        <span>Bartenders</span>
                        <span className="font-mono text-text-dim">
                          {coberturaFuncaoHoje.bartender}/{coberturaFuncaoHoje.necessario.bartender}
                        </span>
                      </div>
                      <ProgressBar
                        valor={coberturaFuncaoHoje.necessario.bartender > 0 ? (coberturaFuncaoHoje.bartender / coberturaFuncaoHoje.necessario.bartender) * 100 : 0}
                        categoria="pessoas"
                        glow
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[10.5px] font-bold uppercase tracking-wide text-text-faint">
                        <span>Barbacks</span>
                        <span className="font-mono text-text-dim">
                          {coberturaFuncaoHoje.barback}/{coberturaFuncaoHoje.necessario.barback}
                        </span>
                      </div>
                      <ProgressBar
                        valor={coberturaFuncaoHoje.necessario.barback > 0 ? (coberturaFuncaoHoje.barback / coberturaFuncaoHoje.necessario.barback) * 100 : 0}
                        categoria="pessoas"
                        glow
                      />
                    </div>
                  </div>
                </>
              )}
            </Panel>

            <Panel>
              <PanelHeader titulo="Ações rápidas" />
              <div className="flex flex-col gap-2">
                <Link to="/orcamentos" className="flex items-center justify-between rounded-sm bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-ink hover:bg-accent-strong">
                  Novo orçamento 20/80 <span>→</span>
                </Link>
                <Link to="/logistica" className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  Ver frota e frete <span className="text-text-faint">→</span>
                </Link>
                <Link to="/agenda" className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  Ver agenda mensal <span className="text-text-faint">→</span>
                </Link>
                <Link to="/agenda?novo=bloqueio" className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} /> Bloquear data
                  </span>
                  <span className="text-text-faint">→</span>
                </Link>
                <Link to="/ponto" className="flex items-center justify-between rounded-sm border border-line px-3 py-2.5 text-[13px] text-text hover:bg-raised">
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="h-3.5 w-3.5 text-text-faint" strokeWidth={2} /> Confirmação de chegada
                  </span>
                  <span className="text-text-faint">→</span>
                </Link>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                titulo="Compras chegando"
                acao={
                  <Link to="/logistica" className={linkPainelOperacao}>
                    Ver logística <Truck className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              {comprasChegando.hojeCount === 0 && comprasChegando.semanaCount === 0 ? (
                <p className="text-sm text-text-dim">Nenhuma entrega prevista pros próximos 7 dias.</p>
              ) : (
                <p className="flex items-center gap-2 text-sm text-text">
                  <PackageCheck className="h-4 w-4 flex-shrink-0 text-ops" strokeWidth={2} />
                  {comprasChegando.hojeCount > 0
                    ? `${comprasChegando.hojeCount} entrega(s) prevista(s) hoje`
                    : `${comprasChegando.semanaCount} entrega(s) prevista(s) essa semana`}
                </p>
              )}
            </Panel>

            <Panel>
              <PanelHeader titulo="Próximas datas" desc="Não cancelados, a partir de amanhã" />
              {proximosEventos.length === 0 ? (
                <p className="text-sm text-text-dim">Nenhum evento futuro além de hoje.</p>
              ) : (
                <div className="overflow-x-auto">
                  {/* Mini-cards de vidro leve (DESIGN.md > Tables & Lists,
                      2026-09-09), não mais <table>/<tr> crua. */}
                  <div className="flex min-w-[260px] flex-col gap-1.5">
                    <div className="grid grid-cols-[70px_1fr_auto] gap-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">
                      <span>Data</span>
                      <span>Cliente</span>
                      <span className="text-right">Status</span>
                    </div>
                    {proximosEventos.map((ev) => (
                      <div key={ev.id} className="list-row grid grid-cols-[70px_1fr_auto] items-center gap-2 px-2.5 py-1.5 text-[12.5px]">
                        <span className="text-text-dim">{formatarData(ev.data_evento)}</span>
                        <span className="max-w-0 truncate text-text">{ev.contrato?.lead?.nome ?? '—'}</span>
                        <Badge tom={STATUS_EVENTO_INFO[ev.status].tom} texto={STATUS_EVENTO_INFO[ev.status].rotulo} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </Reveal>
      </Conteudo>
    </>
  );
}
