import jsPDF from 'jspdf';
import { formatarData, formatarMoeda } from './status';

const COR_ACCENT: [number, number, number] = [232, 161, 61]; // #e8a13d — mesmo tom do design system (ver pdfProposta.ts)
const COR_TEXTO: [number, number, number] = [30, 28, 25];
const COR_DIM: [number, number, number] = [110, 105, 98];
const COR_SUCESSO: [number, number, number] = [21, 128, 61];
const COR_PERIGO: [number, number, number] = [185, 28, 28];

const X_ESQ = 14;
const X_DIR = 196;
const Y_RODAPE = 290;

export type DadosRelatorioExecutivo = {
  mesRotulo: string;
  faturamentoContratado: number;
  faturamentoRecebido: number;
  faturamentoAReceber: number;
  receitaBrutaDre: number;
  custosDre: number;
  lucroLiquidoDre: number;
  eventosNoMes: number;
  convidadosAtendidos: number;
  escalasNoMes: number;
  escalasConfirmadasNoMes: number;
  leadsNovosNoMes: number;
  leadsEmNegociacao: number;
  leadsGanhosTotal: number;
  leadsPerdidosTotal: number;
  /** null quando nenhum evento do mês foi auditado ainda — nunca fabricar
      um NPS médio de zero pontos. */
  npsMedioNoMes: number | null;
  eventosAuditadosNoMes: number;
  contratosTravadosD15: number;
};

function tituloSecao(doc: jsPDF, texto: string, y: number) {
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COR_ACCENT);
  doc.text(texto.toUpperCase(), X_ESQ, y);
  doc.setDrawColor(...COR_ACCENT);
  doc.setLineWidth(0.4);
  doc.line(X_ESQ, y + 2, X_DIR, y + 2);
}

function linha(doc: jsPDF, rotulo: string, valor: string, y: number, corValor: [number, number, number] = COR_TEXTO) {
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COR_TEXTO);
  doc.text(rotulo, X_ESQ, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...corValor);
  doc.text(valor, X_DIR, y, { align: 'right' });
}

/**
 * Relatório executivo consolidado (Fase D do roadmap, 2026-09-11) — o
 * "Relatório Executivo" que apareceu no print original e nunca existiu
 * de verdade. Junta financeiro (Financeiro/DRE), operação (eventos,
 * escala), comercial (CRM) e satisfação (Auditoria) — tudo dado real já
 * calculado em cada tela, nunca um número novo fabricado aqui. Pensado
 * pra imprimir/mandar pra sócio ou só pra revisão mensal sua, sem
 * precisar montar nada na mão.
 */
export function gerarRelatorioExecutivoPdf(d: DadosRelatorioExecutivo): void {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(...COR_TEXTO);
  doc.setFont('helvetica', 'bold');
  doc.text('EM CENA EVENTOS', X_ESQ, 20);

  doc.setFontSize(11);
  doc.setTextColor(...COR_ACCENT);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Executivo — ${d.mesRotulo}`, X_ESQ, 27);

  doc.setDrawColor(...COR_ACCENT);
  doc.setLineWidth(0.6);
  doc.line(X_ESQ, 31, X_DIR, 31);

  let y = 44;

  tituloSecao(doc, 'Financeiro', y);
  y += 11;
  linha(doc, 'Faturamento contratado no mês', formatarMoeda(d.faturamentoContratado), y);
  y += 7;
  linha(doc, 'Recebido no mês', formatarMoeda(d.faturamentoRecebido), y, COR_SUCESSO);
  y += 7;
  linha(doc, 'A receber', formatarMoeda(d.faturamentoAReceber), y, d.faturamentoAReceber > 0 ? COR_PERIGO : COR_TEXTO);
  y += 7;
  linha(doc, 'DRE — receita bruta paga', formatarMoeda(d.receitaBrutaDre), y);
  y += 7;
  linha(doc, 'DRE — custos totais', formatarMoeda(d.custosDre), y);
  y += 7;
  linha(doc, 'DRE — lucro líquido', formatarMoeda(d.lucroLiquidoDre), y, d.lucroLiquidoDre >= 0 ? COR_SUCESSO : COR_PERIGO);
  y += 14;

  tituloSecao(doc, 'Operação', y);
  y += 11;
  linha(doc, 'Eventos realizados no mês', String(d.eventosNoMes), y);
  y += 7;
  linha(doc, 'Convidados atendidos', String(d.convidadosAtendidos), y);
  y += 7;
  linha(doc, 'Escalas no mês (confirmadas / total)', `${d.escalasConfirmadasNoMes} / ${d.escalasNoMes}`, y);
  y += 7;
  linha(doc, 'Contratos travados agora (D-15, saldo pendente)', String(d.contratosTravadosD15), y, d.contratosTravadosD15 > 0 ? COR_PERIGO : COR_TEXTO);
  y += 14;

  tituloSecao(doc, 'Comercial', y);
  y += 11;
  linha(doc, 'Novos leads no mês', String(d.leadsNovosNoMes), y);
  y += 7;
  linha(doc, 'Leads em negociação (total atual)', String(d.leadsEmNegociacao), y);
  y += 7;
  const totalHistorico = d.leadsGanhosTotal + d.leadsPerdidosTotal;
  const taxaConversao = totalHistorico > 0 ? (d.leadsGanhosTotal / totalHistorico) * 100 : null;
  linha(doc, 'Taxa de conversão geral (ganhos / ganhos+perdidos)', taxaConversao != null ? `${taxaConversao.toFixed(1)}%` : 'sem dado suficiente', y);
  y += 14;

  tituloSecao(doc, 'Satisfação', y);
  y += 11;
  linha(doc, 'NPS médio dos eventos auditados no mês', d.npsMedioNoMes != null ? d.npsMedioNoMes.toFixed(1) : 'sem dado no mês', y);
  y += 7;
  linha(doc, 'Cobertura de auditoria pós-evento', `${d.eventosAuditadosNoMes} de ${d.eventosNoMes} evento(s)`, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COR_DIM);
  doc.text(`Emitido em ${formatarData(new Date().toISOString())} — Em Cena Eventos`, X_ESQ, Y_RODAPE);

  doc.save(`relatorio-executivo-${d.mesRotulo.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`);
}
