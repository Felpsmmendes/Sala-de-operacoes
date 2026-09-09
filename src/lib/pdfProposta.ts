import jsPDF from 'jspdf';
import type { ItemSelecionado } from './mensagemOrcamento';
import { formatarData, formatarMoeda } from './status';
import type { Lead } from './types';

const COR_ACCENT: [number, number, number] = [232, 161, 61]; // #e8a13d — mesmo tom do design system
const COR_TEXTO: [number, number, number] = [30, 28, 25];
const COR_DIM: [number, number, number] = [110, 105, 98];

const X_ESQ = 14;
const X_DIR = 196;
const LARGURA_UTIL = X_DIR - X_ESQ;
const Y_RODAPE = 290;
/** abaixo disso, o próximo bloco já pede página nova — deixa uma folga
    antes do rodapé fixo (Y_RODAPE) pra nunca sobrepor. */
const LIMITE_INFERIOR = 274;

/** Pula de página se o próximo trecho (altura estimada em mm) não couber
    mais no espaço restante — sem isso, texto por serviço mais longo
    (pedido do usuário: "deixe mais cheio") vazaria pro rodapé ou cortaria
    no meio de um orçamento com vários serviços. */
function garantirEspaco(doc: jsPDF, y: number, alturaNecessaria: number): number {
  if (y + alturaNecessaria <= LIMITE_INFERIOR) return y;
  doc.addPage();
  return 20;
}

/**
 * Gera a mesma proposta do "Gerar mensagem" (WhatsApp), mas como PDF pra
 * enviar por e-mail/anexo. Fundo claro de propósito (documento impresso/
 * anexo pro cliente, não uma tela do sistema).
 *
 * Reescrito (2026-09-07) — pedido do usuário: cada serviço virou um bloco
 * de verdade (nome + valor, parágrafo de venda, duração, benefícios ✔),
 * o mesmo texto rico de `servicos.mensagem_*` já usado no "Gerar
 * mensagem" (ver mensagemOrcamento.ts), em vez de uma linha só de tabela
 * com a descrição curta. Trocou a tabela (`jspdf-autotable`) por texto
 * desenhado à mão com paginação manual — sem isso o PDF nunca cresceria
 * o bastante pra caber esse texto todo.
 */
export function gerarPdfProposta({
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
  frete?: { regiaoNome: string; valor: number } | null;
}): void {
  const sinal = Math.round(total * 0.2 * 100) / 100;
  const saldo = Math.round(total * 0.8 * 100) / 100;
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(...COR_TEXTO);
  doc.setFont('helvetica', 'bold');
  doc.text('EM CENA EVENTOS', X_ESQ, 20);

  doc.setFontSize(11);
  doc.setTextColor(...COR_ACCENT);
  doc.setFont('helvetica', 'normal');
  doc.text('Proposta Comercial', X_ESQ, 27);

  doc.setDrawColor(...COR_ACCENT);
  doc.setLineWidth(0.6);
  doc.line(X_ESQ, 31, X_DIR, 31);

  doc.setFontSize(10.5);
  doc.setTextColor(...COR_TEXTO);
  let y = 40;
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', X_ESQ, y);
  doc.setFont('helvetica', 'normal');
  doc.text(lead.nome, 40, y);
  y += 6;

  if (dataEvento) {
    doc.setFont('helvetica', 'bold');
    doc.text('Data prevista:', X_ESQ, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatarData(dataEvento), 40, y);
    y += 6;
  }
  if (convidados) {
    doc.setFont('helvetica', 'bold');
    doc.text('Convidados:', X_ESQ, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(convidados), 40, y);
    y += 6;
  }
  y += 6;

  // -------------------- um bloco completo por serviço --------------------
  itens.forEach((item, indice) => {
    const { servico, valor } = item;

    if (indice > 0) {
      y = garantirEspaco(doc, y, 10);
      doc.setDrawColor(225, 220, 210);
      doc.setLineWidth(0.2);
      doc.line(X_ESQ, y, X_DIR, y);
      y += 8;
    }

    y = garantirEspaco(doc, y, 12);
    doc.setFontSize(12.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COR_TEXTO);
    doc.text(servico.nome, X_ESQ, y);
    doc.setTextColor(...COR_ACCENT);
    doc.text(formatarMoeda(valor), X_DIR, y, { align: 'right' });
    y += 6.5;

    const descricao = servico.mensagem_descricao ?? servico.descricao;
    if (descricao) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COR_TEXTO);
      const linhas: string[] = doc.splitTextToSize(descricao, LARGURA_UTIL);
      y = garantirEspaco(doc, y, linhas.length * 4.6);
      doc.text(linhas, X_ESQ, y);
      y += linhas.length * 4.6 + 2;
    }

    if (servico.mensagem_horas) {
      y = garantirEspaco(doc, y, 5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COR_DIM);
      doc.text(`Duração: ${servico.mensagem_horas}`, X_ESQ, y);
      y += 5.5;
    }

    if (servico.mensagem_informacoes) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COR_TEXTO);
      const bullets = servico.mensagem_informacoes.split('\n').filter((linha) => linha.trim());
      for (const bullet of bullets) {
        const linhas: string[] = doc.splitTextToSize(bullet, LARGURA_UTIL - 4);
        y = garantirEspaco(doc, y, linhas.length * 4.6);
        doc.text(linhas, X_ESQ + 2, y);
        y += linhas.length * 4.6;
      }
    }

    y += 5;
  });

  // -------------------- total e condição de pagamento --------------------
  y = garantirEspaco(doc, y, 24);
  doc.setDrawColor(...COR_ACCENT);
  doc.setLineWidth(0.4);
  doc.line(X_ESQ, y, X_DIR, y);
  y += 8;

  if (frete && frete.valor > 0) {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COR_TEXTO);
    doc.text(`Frete (${frete.regiaoNome}):`, X_ESQ, y);
    doc.text(formatarMoeda(frete.valor), X_DIR, y, { align: 'right' });
    y += 7;
  }

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COR_TEXTO);
  doc.text('Valor total:', X_ESQ, y);
  doc.setTextColor(...COR_ACCENT);
  doc.text(formatarMoeda(total), X_DIR, y, { align: 'right' });
  y += 9;

  doc.setDrawColor(220, 214, 205);
  doc.setLineWidth(0.3);
  doc.line(X_ESQ, y - 4, X_DIR, y - 4);

  doc.setFontSize(10);
  doc.setTextColor(...COR_DIM);
  doc.setFont('helvetica', 'normal');
  doc.text('Condição de pagamento: 20% de sinal + 80% até 20 dias antes do evento', X_ESQ, y);
  y += 6;
  doc.text(`Sinal (20%): ${formatarMoeda(sinal)}    ·    Saldo (80%): ${formatarMoeda(saldo)}`, X_ESQ, y);
  y += 12;

  y = garantirEspaco(doc, y, 10);
  doc.setFontSize(9);
  doc.text('Proposta válida por 7 dias a partir da data de emissão. Valores sujeitos a confirmação de disponibilidade de agenda.', X_ESQ, y, { maxWidth: LARGURA_UTIL });

  // -------------------- rodapé em todas as páginas --------------------
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COR_DIM);
    doc.text(`Emitido em ${formatarData(new Date().toISOString())} — Em Cena Eventos`, X_ESQ, Y_RODAPE);
    if (totalPaginas > 1) doc.text(`Página ${p}/${totalPaginas}`, X_DIR, Y_RODAPE, { align: 'right' });
  }

  doc.save(`proposta-${lead.nome.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`);
}
