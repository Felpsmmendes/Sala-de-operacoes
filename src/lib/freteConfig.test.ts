import { describe, expect, it } from 'vitest';
import { calcularFrete, TARIFA_FRETE } from './freteConfig';

describe('calcularFrete', () => {
  it('carro (sedan/van): combustível = (km / 10km/L) * R$7,00 gasolina', () => {
    const r = calcularFrete({ tipoVeiculo: 'van', consumoMedio: null, kmIdaVolta: 100, pedagios: 0, qtdBarmenCarro: 0, pedagiosBarmen: 0, valorLalamove: 0 });
    // 100km / 10km/L * 7,00 = 70,00
    expect(r.custoCombustivel).toBe(70);
  });

  it('caminhão: usa diesel (R$7,10) e consumo médio de 7km/L, nunca a tarifa de carro', () => {
    const r = calcularFrete({ tipoVeiculo: 'caminhao', consumoMedio: null, kmIdaVolta: 70, pedagios: 0, qtdBarmenCarro: 0, pedagiosBarmen: 0, valorLalamove: 0 });
    // 70km / 7km/L * 7,10 = 71,00
    expect(r.custoCombustivel).toBe(71);
  });

  it('consumo médio real do veículo (cadastrado) tem prioridade sobre a média por tipo', () => {
    const r = calcularFrete({ tipoVeiculo: 'van', consumoMedio: 8, kmIdaVolta: 80, pedagios: 0, qtdBarmenCarro: 0, pedagiosBarmen: 0, valorLalamove: 0 });
    // 80km / 8km/L (cadastrado, não os 10km/L padrão) * 7,00 = 70,00
    expect(r.custoCombustivel).toBe(70);
  });

  it('custo de barmen = R$100 por barman no carro + pedágios dos barmen', () => {
    const r = calcularFrete({ tipoVeiculo: 'van', consumoMedio: 10, kmIdaVolta: 0, pedagios: 0, qtdBarmenCarro: 2, pedagiosBarmen: 15, valorLalamove: 0 });
    expect(r.custoBarmen).toBe(2 * TARIFA_FRETE.ajudaCustoPorBarman + 15);
  });

  it('frete cobrado é o custo real + 30% de margem, quando isso já passa do mínimo', () => {
    const r = calcularFrete({ tipoVeiculo: 'van', consumoMedio: 10, kmIdaVolta: 300, pedagios: 20, qtdBarmenCarro: 0, pedagiosBarmen: 0, valorLalamove: 0 });
    expect(r.custoReal).toBe(230); // 210 combustível (300km/10km/L*7) + 20 pedágio
    expect(r.freteComMargem).toBe(299); // 230 * 1.3
    expect(r.valorFrete).toBe(299);
    expect(r.freteMinimoUsado).toBe(false);
  });

  it('nunca cobra menos que o mínimo de R$150, mesmo com custo real baixíssimo', () => {
    const r = calcularFrete({ tipoVeiculo: 'van', consumoMedio: 10, kmIdaVolta: 10, pedagios: 0, qtdBarmenCarro: 0, pedagiosBarmen: 0, valorLalamove: 0 });
    expect(r.valorFrete).toBe(TARIFA_FRETE.freteMinimo);
    expect(r.freteMinimoUsado).toBe(true);
  });

  it('Lalamove/transporte avulso entra direto no custo real, sem passar pela margem de combustível', () => {
    const r = calcularFrete({ tipoVeiculo: 'van', consumoMedio: 10, kmIdaVolta: 0, pedagios: 0, qtdBarmenCarro: 0, pedagiosBarmen: 0, valorLalamove: 50 });
    expect(r.custoReal).toBe(50);
    expect(r.freteComMargem).toBe(65); // 50 * 1.3 — ainda abaixo do mínimo
    expect(r.valorFrete).toBe(TARIFA_FRETE.freteMinimo);
  });
});
