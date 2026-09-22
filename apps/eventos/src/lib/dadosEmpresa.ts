/** Dados da empresa (2026-09-18, REVIEW_DECISOES_V2 Parte 6/14, P1 —
    "Empresa: apenas campos consumidos pelos PDFs") — guardados no
    navegador (localStorage), não no banco: mesma lógica de `ConfigPix`
    (config local do negócio, não dado compartilhado entre usuários — e
    aqui só existe 1 usuário mesmo). Antes ficavam como uma constante
    fixa direto em `pdfProposta.ts` (`EMPRESA`), sem tela nenhuma pra
    editar — só dava pra trocar mexendo no código. */
const CHAVE_LOCALSTORAGE = 'emcena_dados_empresa';

export type DadosEmpresa = {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  site: string;
  email: string;
};

const PADRAO: DadosEmpresa = {
  nome: 'Em Cena Eventos',
  cnpj: '',
  endereco: '',
  telefone: '',
  site: 'emcenaeventos.com.br',
  email: 'contato@emcenaeventos.com.br',
};

export function carregarDadosEmpresa(): DadosEmpresa {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return bruto ? { ...PADRAO, ...JSON.parse(bruto) } : PADRAO;
  } catch {
    return PADRAO;
  }
}

export function salvarDadosEmpresa(dados: DadosEmpresa): void {
  localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(dados));
}
