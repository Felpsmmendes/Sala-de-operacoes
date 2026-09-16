import { useState, type FormEvent } from 'react';
import type { CategoriaEstoque, NovoItemEstoque } from '../../lib/api/estoque';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export function ItemForm({ onSalvar, salvando }: { onSalvar: (dados: NovoItemEstoque) => void; salvando: boolean }) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaEstoque>('bebida');
  const [unidade, setUnidade] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState('0');
  const [estoqueMinimo, setEstoqueMinimo] = useState('0');
  const [consumoPorPax, setConsumoPorPax] = useState('');

  function aoSubmeter(ev: FormEvent) {
    ev.preventDefault();
    onSalvar({
      nome,
      categoria,
      unidade,
      estoque_atual: Number(estoqueAtual) || 0,
      estoque_minimo: Number(estoqueMinimo) || 0,
      consumo_por_pax: consumoPorPax ? Number(consumoPorPax) : null,
    });
    setNome('');
    setUnidade('');
    setEstoqueAtual('0');
    setEstoqueMinimo('0');
    setConsumoPorPax('');
  }

  return (
    <form onSubmit={aoSubmeter} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <Input rotulo="Nome" categoria="operacao" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Gin nacional" />
      </div>
      <Select rotulo="Categoria" categoria="operacao" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaEstoque)}>
        <option value="bebida">Bebida</option>
        <option value="insumo">Insumo</option>
        <option value="gelo">Gelo</option>
        <option value="descartavel">Descartável</option>
        <option value="outro">Outro</option>
      </Select>
      <Input rotulo="Unidade" categoria="operacao" required value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: garrafa, kg, saco" />
      <Input rotulo="Estoque atual" categoria="operacao" type="number" min={0} step="0.01" value={estoqueAtual} onChange={(e) => setEstoqueAtual(e.target.value)} />
      <Input
        rotulo="Estoque mínimo"
        dicaTooltip="Dispara alerta quando a quantidade atual cai abaixo deste valor."
        categoria="operacao"
        type="number"
        min={0}
        step="0.01"
        value={estoqueMinimo}
        onChange={(e) => setEstoqueMinimo(e.target.value)}
      />
      <div className="sm:col-span-3">
        <Input
          rotulo="Consumo por convidado (opcional)"
          dicaTooltip="Habilita a calculadora preditiva de quanto vai ser gasto por evento, com base no número de convidados."
          categoria="operacao"
          type="number"
          min={0}
          step="0.0001"
          value={consumoPorPax}
          onChange={(e) => setConsumoPorPax(e.target.value)}
          placeholder="Ex: 0.15 (garrafas por convidado)"
        />
      </div>
      <div className="sm:col-span-3">
        <button type="submit" disabled={salvando} className="rounded-sm bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Adicionar item'}
        </button>
      </div>
    </form>
  );
}
