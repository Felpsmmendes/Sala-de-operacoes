import { calcularStaffNecessario } from './staffing';
import type { CategoriaServico, Lead, Servico } from './types';
import { formatarMoeda, formatarData } from './status';

export type ItemSelecionado = {
  servico: Servico;
  /** Valor base do item (sem hora adicional) — igual ao cálculo de sempre. */
  valor: number;
  /** Horas além da duração padrão (5h bar / 4h atração), 0 quando não marcado. */
  horasAdicionais: number;
  /** Quanto vale 1h adicional deste item — 0 pra categorias sem esse conceito. */
  valorHoraAdicional: number;
};

/** Emoji do cabeçalho de cada item — Bar Sem Álcool ganha um emoji
    próprio (🍹, "drink tropical") pra se diferenciar visualmente dos
    bares alcoólicos (🍸) na mensagem, mesma distinção que a empresa já
    faz na prática. */
function emojiServico(servico: Servico): string {
  if (servico.categoria === 'bar' && servico.nome.toLowerCase().includes('sem álcool')) return '🍹';
  if (servico.categoria === 'bar') return '🍸';
  if (servico.categoria === 'atracao') return '📸';
  return '📖';
}

const TITULO_CATEGORIA: Record<CategoriaServico, string> = {
  bar: '🍸 PACOTES DE BAR',
  atracao: '📸✨ ATRAÇÕES PARA O SEU EVENTO',
  adicional: '➕ SERVIÇOS ADICIONAIS',
};

const INTRO_CATEGORIA: Record<CategoriaServico, string> = {
  bar: 'Todo pacote de bar sai com equipe de bartenders profissionais, com formação na área — não trabalhamos com mão de obra improvisada.',
  atracao: 'Além do bar, temos atrações pra deixar o seu evento ainda mais divertido, interativo e inesquecível! 💛',
  adicional: 'Serviços extras pra deixar a experiência ainda mais completa.',
};

/** "1.5" -> "1h30", "2" -> "2h" — mesma leitura de horário quebrado que o
    usuário já usa (ex.: "1.5 para 1h30"). */
function formatarHoras(horas: number): string {
  const h = Math.floor(horas);
  const minutos = Math.round((horas - h) * 60);
  return minutos === 0 ? `${h}h` : `${h}h${String(minutos).padStart(2, '0')}`;
}

const ORDEM_CATEGORIA: CategoriaServico[] = ['bar', 'atracao', 'adicional'];
const NOME_CATEGORIA_RESUMO: Record<CategoriaServico, string> = { bar: 'bar', atracao: 'atrações', adicional: 'serviços adicionais' };

/** "com bar e atrações" / "com bar" / "com atrações e serviços adicionais"
    — resumo natural das categorias presentes no orçamento, pra usar na
    frase de abertura sem citar cada item (isso vem depois, em blocos). */
function resumoCategorias(itens: ItemSelecionado[]): string {
  const presentes = ORDEM_CATEGORIA.filter((cat) => itens.some((i) => i.servico.categoria === cat)).map((cat) => NOME_CATEGORIA_RESUMO[cat]);
  if (presentes.length === 0) return '';
  if (presentes.length === 1) return presentes[0];
  return `${presentes.slice(0, -1).join(', ')} e ${presentes[presentes.length - 1]}`;
}

/** Bloco de um serviço: cabeçalho (emoji + nome + valor) + parágrafo de
    venda + duração + equipe escalada (só bar, calculada de verdade pela
    regra de staffing — não é um número solto) + lista de benefícios. */
function blocoServico(item: ItemSelecionado, convidados: number | null): string {
  const { servico, valor, horasAdicionais, valorHoraAdicional } = item;
  const linhas = [`${emojiServico(servico)} ${servico.nome.toUpperCase()} — ${formatarMoeda(valor)}`];

  const descricao = servico.mensagem_descricao ?? servico.descricao;
  if (descricao) linhas.push(descricao);

  const detalhes: string[] = [];
  if (servico.mensagem_horas) detalhes.push(`⏱️ ${servico.mensagem_horas}`);
  if (servico.categoria === 'bar' && convidados) {
    const { bartender, barback } = calcularStaffNecessario(convidados);
    const equipe = [bartender > 1 ? `${bartender} bartenders` : '1 bartender', barback > 1 ? `${barback} barbacks` : '1 barback'].join(' + ');
    detalhes.push(`👤 Equipe escalada para ${convidados} convidados: ${equipe}`);
  }
  // hora adicional marcada pro item (2026-09-09, pedido do usuário) — só
  // aparece quando horasAdicionais > 0, nunca em todos os itens automaticamente.
  if (horasAdicionais > 0) {
    const valorExtra = horasAdicionais * valorHoraAdicional;
    detalhes.push(`⏱️ Hora extra (${formatarHoras(horasAdicionais)}): ${formatarMoeda(valorExtra)}`);
    detalhes.push(`💰 Total deste serviço com hora extra: ${formatarMoeda(valor + valorExtra)}`);
  }
  if (detalhes.length) linhas.push(detalhes.join('\n'));

  if (servico.mensagem_informacoes) linhas.push(servico.mensagem_informacoes);

  return linhas.join('\n\n');
}

/** Monta a mensagem de WhatsApp do orçamento — reescrito (2026-09-07) pra
    seguir o mesmo formato que a empresa já usa de verdade com clientes
    (referência do usuário: cabeçalho com emoji+valor por item, bullets
    "✔" de benefícios, texto corrido de venda) em vez de uma lista solta
    de "serviço — valor". O texto de cada serviço vem de
    `servicos.mensagem_*` (dado real, migrado do painel anterior — ver
    migration_011) — nunca inventado aqui; serviço sem esse texto cai de
    volta na `descricao` curta. */
export function montarMensagemOrcamento({
  lead,
  dataEvento,
  convidados,
  itens,
  total,
  frete,
}: {
  lead: Lead;
  dataEvento: string | null;
  convidados: number | null;
  itens: ItemSelecionado[];
  total: number;
  /** Frete cobrado do cliente (2026-09-09) — null/valor 0 quando o
      orçamento não cobra frete separado. Só aparece na mensagem quando
      tem valor de verdade, igual à hora adicional. */
  frete?: { regiaoNome: string; valor: number } | null;
}): string {
  const sinal = Math.round(total * 0.2 * 100) / 100;
  const saldo = Math.round(total * 0.8 * 100) / 100;
  const resumo = resumoCategorias(itens);

  const partes: string[] = [
    `Olá, ${lead.nome}! 😊\n\nConforme conversamos, preparei uma proposta especial para o seu evento${resumo ? `, com ${resumo}` : ''}, pra tornar esse momento ainda mais inesquecível.`,
  ];

  const infoEvento: string[] = [];
  if (dataEvento) infoEvento.push(`📅 Data: ${formatarData(dataEvento)}`);
  if (convidados) infoEvento.push(`👥 Convidados: ${convidados}`);
  if (infoEvento.length) partes.push(infoEvento.join('\n'));

  // agrupa por categoria (bar → atrações → adicionais), preservando a
  // ordem de seleção dentro de cada categoria — o título/intro da
  // categoria aparece uma vez só, mesmo com vários itens da mesma.
  const itensPorCategoria = [...itens].sort((a, b) => ORDEM_CATEGORIA.indexOf(a.servico.categoria) - ORDEM_CATEGORIA.indexOf(b.servico.categoria));
  let categoriaAtual: CategoriaServico | null = null;
  for (const item of itensPorCategoria) {
    if (item.servico.categoria !== categoriaAtual) {
      if (categoriaAtual) partes.push('━━━━━━━━━━━━━━━━━━');
      partes.push(`${TITULO_CATEGORIA[item.servico.categoria]}\n${INTRO_CATEGORIA[item.servico.categoria]}`);
      categoriaAtual = item.servico.categoria;
    }
    partes.push(blocoServico(item, convidados));
  }

  if (frete && frete.valor > 0) partes.push(`🚚 Frete (${frete.regiaoNome}): ${formatarMoeda(frete.valor)}`);
  partes.push(`💰 Valor total: ${formatarMoeda(total)}`);
  partes.push(`💳 Condição: 20% de sinal (${formatarMoeda(sinal)}) + 80% até 20 dias antes do evento (${formatarMoeda(saldo)})`);
  partes.push(
    'Nosso objetivo é proporcionar uma experiência completa, com qualidade, atendimento profissional e uma estrutura que faça a diferença no seu evento. Qualquer dúvida ou ajuste que precisar, fico à disposição! 💛'
  );
  partes.push('Equipe Em Cena Eventos');

  return partes.join('\n\n');
}
