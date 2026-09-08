/** Parâmetros reais da calculadora de frete da empresa — conferidos contra
    "Calculadora_de_Frete_Em_Cena_Eventos.xlsx" (aba Configurações) e contra
    o painel antigo (../../Texto/gerador-mensagens-em-cena.html), que usam
    exatamente os mesmos valores. Editar aqui se o preço do combustível ou
    a margem mudar — não precisa mexer no cálculo em si. */
export const TARIFA_FRETE = {
  precoGasolina: 7.0, // R$/L — carro/van
  precoDiesel: 7.1, // R$/L — caminhão
  consumoCarro: 10.0, // km/L
  consumoCaminhao: 7.0, // km/L
  ajudaCustoPorBarman: 100.0, // R$ por barman indo de carro
  margem: 0.3, // 30% sobre o custo real
  freteMinimo: 150.0, // R$ mínimo cobrado
};

export type EntradaFrete = {
  tipoVeiculo: 'caminhao' | 'sedan' | 'van';
  kmIdaVolta: number;
  pedagios: number;
  qtdBarmenCarro: number;
  pedagiosBarmen: number;
  valorLalamove: number;
};

export type ResultadoFrete = {
  custoCombustivel: number;
  custoBarmen: number;
  custoReal: number;
  freteComMargem: number;
  freteMinimoUsado: boolean;
  valorFrete: number;
};

/** Mesma fórmula da planilha e do painel antigo:
    custoCombustivel = (km / consumo) * preço do combustível
    custoBarmen      = ajudaDeCusto * qtdBarmen + pedágios dos barmen
    custoReal        = custoCombustivel + custoBarmen + pedágios do veículo + Lalamove
    freteComMargem   = custoReal * (1 + margem)
    valorFrete       = maior valor entre freteComMargem e freteMínimo */
export function calcularFrete(entrada: EntradaFrete): ResultadoFrete {
  const precoCombustivel = entrada.tipoVeiculo === 'caminhao' ? TARIFA_FRETE.precoDiesel : TARIFA_FRETE.precoGasolina;
  const consumo = entrada.tipoVeiculo === 'caminhao' ? TARIFA_FRETE.consumoCaminhao : TARIFA_FRETE.consumoCarro;

  const custoCombustivel = consumo > 0 ? (entrada.kmIdaVolta / consumo) * precoCombustivel : 0;
  const custoBarmen = TARIFA_FRETE.ajudaCustoPorBarman * entrada.qtdBarmenCarro + entrada.pedagiosBarmen;
  const custoReal = custoCombustivel + custoBarmen + entrada.pedagios + entrada.valorLalamove;
  const freteComMargem = custoReal * (1 + TARIFA_FRETE.margem);
  const valorFrete = Math.max(freteComMargem, TARIFA_FRETE.freteMinimo);

  return {
    custoCombustivel: arredondar(custoCombustivel),
    custoBarmen: arredondar(custoBarmen),
    custoReal: arredondar(custoReal),
    freteComMargem: arredondar(freteComMargem),
    freteMinimoUsado: freteComMargem < TARIFA_FRETE.freteMinimo,
    valorFrete: arredondar(valorFrete),
  };
}

function arredondar(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
