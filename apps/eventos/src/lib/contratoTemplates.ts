import type { FormaPagamento, TipoContrato } from './types';

/** Rótulo por extenso pro documento jurídico — diferente do rótulo curto
    já usado na listagem de Contratos.tsx ("PIX"/"Boleto"/"Cartão"). */
export const FORMA_PAGAMENTO_EXTENSO: Record<FormaPagamento, string> = { pix: 'PIX', boleto: 'Boleto bancário', cartao: 'Cartão de crédito' };

export const TIPO_CONTRATO_ROTULO: Record<TipoContrato, string> = {
  bar_service: 'Bar Service',
  photo_booth: 'Photo Booth / Totem',
  combo: 'Combo Bar + Atração',
};

export const TIPO_CONTRATO_DESCRICAO: Record<TipoContrato, string> = {
  bar_service: 'Equipe de bar, drinks autorais, utensílios e montagem.',
  photo_booth: 'Photo booth ou totem 360°, moldura personalizada e galeria digital.',
  combo: 'Bar service completo + atração fotográfica no mesmo contrato.',
};

/** Variáveis disponíveis pro template — o gestor clica numa e ela é
    inserida no cursor do editor como `{{chave}}`; o texto final salvo
    já vem com os valores substituídos (ver preencherTemplate), então o
    cliente nunca vê `{{...}}` solto no documento. */
export type VariaveisContrato = {
  nome_cliente: string;
  data_evento: string;
  local_evento: string;
  convidados: string;
  valor_total: string;
  valor_sinal: string;
  valor_saldo: string;
  forma_pagamento: string;
  data_hoje: string;
};

const RES_VARIAVEL: Record<keyof VariaveisContrato, string> = {
  nome_cliente: 'Nome do cliente',
  data_evento: 'Data do evento (por extenso)',
  local_evento: 'Local do evento',
  convidados: 'Número de convidados',
  valor_total: 'Valor total',
  valor_sinal: 'Valor do sinal',
  valor_saldo: 'Valor do saldo',
  forma_pagamento: 'Forma de pagamento',
  data_hoje: 'Data de hoje (por extenso)',
};
export const ROTULO_VARIAVEL = RES_VARIAVEL;

/** Substitui todo `{{variavel}}` pelo valor correspondente — usado tanto
    ao gerar o texto inicial (Etapa "editar") quanto no preview (o gestor
    pode ter digitado uma variável nova a mão). */
export function preencherTemplate(template: string, vars: VariaveisContrato): string {
  let resultado = template;
  for (const [chave, valor] of Object.entries(vars)) {
    resultado = resultado.replaceAll(`{{${chave}}}`, valor || '—');
  }
  return resultado;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-03-15" → "15 de março de 2026" — registro jurídico usa data por
    extenso, diferente do `formatarData` (DD/MM/AAAA) do resto do app. */
export function formatarDataExtenso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  const indiceMes = Number(mes) - 1;
  if (!ano || indiceMes < 0 || indiceMes > 11) return '—';
  return `${Number(dia)} de ${MESES[indiceMes]} de ${ano}`;
}

const CABECALHO_PARTES = `
<h2>1. Partes</h2>
<p><strong>CONTRATADA:</strong> Em Cena Eventos.</p>
<p><strong>CONTRATANTE:</strong> {{nome_cliente}}</p>
`;

const CLAUSULA_PAGAMENTO = `
<h2>{{numero}}. Valor e Forma de Pagamento</h2>
<p>O valor total pelos serviços é de <strong>{{valor_total}}</strong>, a ser pago da seguinte forma:</p>
<ul>
  <li><strong>Sinal (20%):</strong> {{valor_sinal}} — a ser pago em até 30 dias após a assinatura deste contrato.</li>
  <li><strong>Saldo (80%):</strong> {{valor_saldo}} — a ser pago até 20 dias antes da data do evento.</li>
  <li><strong>Forma de pagamento:</strong> {{forma_pagamento}}</li>
</ul>
<p>O não pagamento do saldo até a data limite pode resultar no cancelamento dos serviços sem devolução do sinal.</p>
`.replace('{{numero}}', '3');

const CLAUSULA_CANCELAMENTO = (numero: string) => `
<h2>${numero}. Cancelamento</h2>
<p>Em caso de cancelamento pelo CONTRATANTE:</p>
<ul>
  <li>Com mais de 60 dias de antecedência: devolução de 50% do sinal.</li>
  <li>Entre 30 e 60 dias: sem devolução do sinal.</li>
  <li>Com menos de 30 dias: sinal retido e cobrança de 30% do saldo.</li>
</ul>
`;

const CLAUSULA_DISPOSICOES = (numero: string) => `
<h2>${numero}. Disposições Gerais</h2>
<p>Este contrato é regido pelas leis do Estado de São Paulo. Fica eleito o foro da Comarca de São Paulo para dirimir quaisquer controvérsias.</p>
<p>São Paulo, {{data_hoje}}.</p>
<p><strong>Em Cena Eventos</strong><br/>CONTRATADA</p>
<p><strong>{{nome_cliente}}</strong><br/>CONTRATANTE</p>
`;

const TEMPLATE_BAR_SERVICE = `
<h1>Contrato de Prestação de Serviços — Bar Service</h1>
<p>Pelo presente instrumento particular, as partes abaixo identificadas celebram o presente Contrato de Prestação de Serviços:</p>
${CABECALHO_PARTES}
<h2>2. Objeto do Contrato</h2>
<p>A CONTRATADA se compromete a prestar serviços de <strong>Bar Service</strong> para o evento do CONTRATANTE, a realizar-se na data de <strong>{{data_evento}}</strong>, no local <strong>{{local_evento}}</strong>, para aproximadamente <strong>{{convidados}} convidados</strong>.</p>
<p>Os serviços incluem:</p>
<ul>
  <li>Equipe de bartenders e barbacks treinados pela Em Cena</li>
  <li>Drinks autorais e clássicos conforme cardápio acordado</li>
  <li>Utensílios, copos e equipamentos de bar</li>
  <li>Montagem e desmontagem do espaço de bar</li>
</ul>
${CLAUSULA_PAGAMENTO}
<h2>4. Obrigações da Contratada</h2>
<ul>
  <li>Comparecer ao local do evento no horário acordado</li>
  <li>Disponibilizar equipe qualificada e devidamente uniformizada</li>
  <li>Executar os serviços conforme o roteiro previamente aprovado</li>
  <li>Prezar pela higiene e organização do espaço de bar</li>
</ul>
<h2>5. Obrigações do Contratante</h2>
<ul>
  <li>Efetuar os pagamentos nos prazos estipulados</li>
  <li>Fornecer espaço adequado para instalação do bar (mínimo 6m²)</li>
  <li>Garantir acesso ao local para montagem com antecedência mínima de 2 horas</li>
  <li>Informar qualquer alteração no número de convidados com 15 dias de antecedência</li>
</ul>
${CLAUSULA_CANCELAMENTO('6')}
${CLAUSULA_DISPOSICOES('7')}
`;

const TEMPLATE_PHOTO_BOOTH = `
<h1>Contrato de Prestação de Serviços — Photo Booth</h1>
<p>Pelo presente instrumento particular, as partes abaixo identificadas celebram o presente Contrato de Prestação de Serviços:</p>
${CABECALHO_PARTES}
<h2>2. Objeto do Contrato</h2>
<p>A CONTRATADA se compromete a prestar serviços de <strong>atração fotográfica (Photo Booth / Totem 360°)</strong> para o evento do CONTRATANTE, a realizar-se na data de <strong>{{data_evento}}</strong>, no local <strong>{{local_evento}}</strong>, para aproximadamente <strong>{{convidados}} convidados</strong>.</p>
<p>Os serviços incluem:</p>
<ul>
  <li>Equipamento profissional de photo booth ou totem 360°</li>
  <li>Operador técnico durante todo o evento</li>
  <li>Moldura personalizada conforme arte aprovada pelo contratante</li>
  <li>Acesso digital às fotos via galeria online</li>
  <li>Montagem e desmontagem do equipamento</li>
</ul>
${CLAUSULA_PAGAMENTO}
<h2>4. Arte da Moldura</h2>
<p>A moldura personalizada deve ser aprovada pelo CONTRATANTE via Portal do Cliente até 15 dias antes do evento. Após este prazo, a arte enviada será utilizada sem alterações.</p>
${CLAUSULA_CANCELAMENTO('5')}
${CLAUSULA_DISPOSICOES('6')}
`;

const TEMPLATE_COMBO = `
<h1>Contrato de Prestação de Serviços — Bar Service + Atração Fotográfica</h1>
<p>Pelo presente instrumento particular, as partes abaixo identificadas celebram o presente Contrato de Prestação de Serviços:</p>
${CABECALHO_PARTES}
<h2>2. Objeto do Contrato</h2>
<p>A CONTRATADA se compromete a prestar serviços de <strong>Bar Service e atração fotográfica</strong> para o evento do CONTRATANTE, a realizar-se na data de <strong>{{data_evento}}</strong>, no local <strong>{{local_evento}}</strong>, para aproximadamente <strong>{{convidados}} convidados</strong>.</p>
<p>Os serviços de Bar Service incluem:</p>
<ul>
  <li>Equipe de bartenders e barbacks treinados</li>
  <li>Drinks autorais e clássicos conforme cardápio acordado</li>
  <li>Utensílios, copos e equipamentos de bar</li>
</ul>
<p>Os serviços de atração fotográfica incluem:</p>
<ul>
  <li>Equipamento de photo booth ou totem 360°</li>
  <li>Operador técnico durante todo o evento</li>
  <li>Moldura personalizada e galeria digital</li>
</ul>
${CLAUSULA_PAGAMENTO}
${CLAUSULA_CANCELAMENTO('4')}
${CLAUSULA_DISPOSICOES('5')}
`;

export const TEMPLATES_CONTRATO: Record<TipoContrato, string> = {
  bar_service: TEMPLATE_BAR_SERVICE,
  photo_booth: TEMPLATE_PHOTO_BOOTH,
  combo: TEMPLATE_COMBO,
};
