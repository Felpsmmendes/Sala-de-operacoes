/** Gera e baixa um arquivo CSV no browser — usado em Contratos, Financeiro,
    Escala e Auditoria pra tirar o dado da tela e levar pra Excel/Planilhas
    (pedido do usuário, 2026-09-14). BOM UTF-8 na frente do conteúdo: sem
    isso o Excel abre acento/cedilha corrompido (lê como Latin-1 por
    padrão sem o BOM). Cada célula sempre entre aspas (mesmo número/data) —
    mais simples e robusto que decidir célula a célula quando precisa
    escapar vírgula/aspas internas.
    `linhas`: primeira linha é o cabeçalho, o resto são os dados.
    `nome`: nome do arquivo sem extensão (a extensão .csv é adicionada aqui). */
export function exportarCsv(linhas: string[][], nome: string): void {
  const conteudo = linhas.map((cols) => cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const BOM_UTF8 = '﻿';
  const blob = new Blob([BOM_UTF8 + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
