import { Building2, CircleDollarSign, MessageSquare, UserPlus, Wrench, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel } from '../components/Panel';
import { Titulo } from '../components/Titulo';
import { RevealGroup } from '../components/ui/Reveal';
import { EstadoVazio } from '../components/ui/EmptyState';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { listarChamados, listarComentariosRecentes } from '../lib/api/chamados';
import { listarCobrancas } from '../lib/api/cobrancas';
import { listarEmpresas } from '../lib/api/empresas';
import { listarInteracoesRecentes, listarLeadsPlataforma } from '../lib/api/leadsPlataforma';
import { formatarData, formatarMoeda } from '../lib/format';
import { dataLocal } from '../lib/metricas';
import { PLANO_ROTULO } from '../lib/rotulos';

type Grupo = 'empresas' | 'cobrancas' | 'chamados' | 'prospeccao';

type Evento = { chave: string; quando: string; grupo: Grupo; titulo: string; detalhe: string; to: string };

const GRUPOS: { id: Grupo | 'todas'; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'empresas', rotulo: 'Empresas' },
  { id: 'cobrancas', rotulo: 'Cobranças' },
  { id: 'chamados', rotulo: 'Chamados' },
  { id: 'prospeccao', rotulo: 'Prospecção' },
];

const VISUAL: Record<Grupo, { Icone: LucideIcon; cor: string }> = {
  empresas: { Icone: Building2, cor: 'bg-accent/15 text-accent-strong' },
  cobrancas: { Icone: CircleDollarSign, cor: 'bg-success/15 text-success' },
  chamados: { Icone: Wrench, cor: 'bg-pending/15 text-pending' },
  prospeccao: { Icone: UserPlus, cor: 'bg-neutral/15 text-neutral' },
};

const TIPO_INTERACAO: Record<string, string> = { mensagem_whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail', reuniao: 'Reunião', nota: 'Nota' };

/** 'YYYY-MM-DD' de pagamento não tem hora — fixa ao meio-dia local pra ordenar dentro do dia. */
const doDia = (dia: string) => new Date(`${dia}T12:00:00`).toISOString();

function rotuloDia(iso: string, hoje: string): string {
  const d = new Date(iso);
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ontem = new Date(`${hoje}T00:00:00`);
  ontem.setDate(ontem.getDate() - 1);
  if (dia === hoje) return 'Hoje';
  if (dia === dataLocal(ontem)) return 'Ontem';
  return formatarData(dia);
}

function hora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Atividades (linha do tempo geral) — montada a partir das tabelas que já
    existem (empresas, cobranças, chamados, prospecção), sem uma tabela de log à
    parte: nunca fica fora de sincronia com o dado real, mas só mostra o que as
    tabelas guardam (ex.: mudança de plano não aparece, porque não há registro
    de quando ela aconteceu). */
export default function Atividades() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<Grupo | 'todas'>('todas');

  useEffect(() => {
    Promise.all([listarEmpresas(), listarCobrancas(), listarChamados(), listarComentariosRecentes(40), listarLeadsPlataforma(), listarInteracoesRecentes(40)])
      .then(([empresas, cobrancas, chamados, comentarios, leads, interacoes]) => {
        const lista: Evento[] = [];
        for (const e of empresas) lista.push({ chave: `e-${e.id}`, quando: e.criado_em, grupo: 'empresas', titulo: `${e.nome} cadastrada`, detalhe: `Plano ${PLANO_ROTULO[e.plano]}`, to: '/empresas' });
        for (const c of cobrancas) {
          const quem = c.empresa?.nome ?? 'Empresa';
          lista.push({ chave: `cb-${c.id}`, quando: c.criado_em, grupo: 'cobrancas', titulo: `Cobrança lançada — ${quem}`, detalhe: `${c.descricao} · ${formatarMoeda(c.valor)}`, to: '/financeiro' });
          if (c.status === 'pago' && c.pago_em) lista.push({ chave: `pg-${c.id}`, quando: doDia(c.pago_em), grupo: 'cobrancas', titulo: `Pagamento recebido — ${quem}`, detalhe: `${c.descricao} · ${formatarMoeda(c.valor)}`, to: '/financeiro' });
        }
        for (const ch of chamados) {
          const quem = ch.empresa?.nome ?? 'Empresa';
          lista.push({ chave: `ch-${ch.id}`, quando: ch.criado_em, grupo: 'chamados', titulo: `Chamado aberto — ${quem}`, detalhe: ch.titulo, to: '/manutencoes' });
          if (ch.resolvido_em) lista.push({ chave: `rs-${ch.id}`, quando: ch.resolvido_em, grupo: 'chamados', titulo: `Chamado resolvido — ${quem}`, detalhe: ch.titulo, to: '/manutencoes' });
        }
        for (const cm of comentarios) lista.push({ chave: `cm-${cm.id}`, quando: cm.criado_em, grupo: 'chamados', titulo: `${cm.autor ?? 'Alguém'} comentou — ${cm.chamado?.empresa?.nome ?? 'chamado'}`, detalhe: cm.conteudo.slice(0, 120), to: '/manutencoes' });
        for (const l of leads) lista.push({ chave: `ld-${l.id}`, quando: l.criado_em, grupo: 'prospeccao', titulo: 'Novo lead', detalhe: l.nome_empresa, to: '/crm' });
        for (const i of interacoes) lista.push({ chave: `in-${i.id}`, quando: i.criado_em, grupo: 'prospeccao', titulo: `${TIPO_INTERACAO[i.tipo] ?? 'Interação'} — ${i.lead?.nome_empresa ?? 'lead'}`, detalhe: i.conteudo.slice(0, 120), to: '/crm' });
        setEventos(lista.sort((a, b) => b.quando.localeCompare(a.quando)));
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar as atividades.'))
      .finally(() => setCarregando(false));
  }, []);

  const hoje = dataLocal();
  const visiveis = useMemo(() => eventos.filter((e) => grupo === 'todas' || e.grupo === grupo).slice(0, 80), [eventos, grupo]);
  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>();
    for (const e of visiveis) {
      const r = rotuloDia(e.quando, hoje);
      mapa.set(r, [...(mapa.get(r) ?? []), e]);
    }
    return [...mapa.entries()];
  }, [visiveis, hoje]);

  return (
    <>
      <Titulo titulo="Atividades" subtitulo="Linha do tempo geral da plataforma." />
      {erro && <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>}

      <div className="mb-4 inline-flex flex-wrap gap-0.5 rounded-md border border-line bg-input p-0.5">
        {GRUPOS.map((g) => (
          <button key={g.id} type="button" onClick={() => setGrupo(g.id)} className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${grupo === g.id ? 'bg-raised text-accent-strong' : 'text-text-dim hover:text-text'}`}>
            {g.rotulo}
          </button>
        ))}
      </div>

      <Panel revelar={0}>
        {carregando ? (
          <SkeletonLinhas n={6} />
        ) : porDia.length === 0 ? (
          <EstadoVazio Icone={MessageSquare} titulo="Nenhuma atividade ainda" descricao="Cadastre empresas, cobranças, chamados ou leads e eles aparecem aqui." />
        ) : (
          <div className="flex flex-col gap-5">
            {porDia.map(([dia, lista]) => (
              <section key={dia}>
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-text-faint">{dia}</p>
                <RevealGroup className="flex flex-col divide-y divide-line" stagger={35}>
                  {lista.map((e) => {
                    const { Icone, cor } = VISUAL[e.grupo];
                    return (
                      <Link key={e.chave} to={e.to} className="flex items-center gap-3 py-2.5 hover:bg-raised/40">
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${cor}`}>
                          <Icone className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-text">{e.titulo}</span>
                          <span className="block truncate text-[12px] text-text-faint">{e.detalhe}</span>
                        </span>
                        <span className="flex-shrink-0 font-mono text-[11px] text-text-faint">{hora(e.quando)}</span>
                      </Link>
                    );
                  })}
                </RevealGroup>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
