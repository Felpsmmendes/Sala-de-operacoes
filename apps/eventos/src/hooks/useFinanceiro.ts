import { useEffect, useMemo, useState } from 'react';
import { listarEventos } from '../lib/api/eventos';
import { atualizarStatusLancamento, criarLancamento, excluirLancamento, listarDreMensal, listarLancamentos } from '../lib/api/financeiro';
import { mensagemDeErro } from '../lib/erroAmigavel';
import { toast } from '../lib/toast';
import type { DreMes, EventoComLead, Lancamento, NovoLancamento } from '../lib/types';

function aoFalhar(e: unknown) {
  toast.erro(mensagemDeErro(e));
}

/** Dado + lógica de negócio compartilhada entre as 4 sub-rotas de
    Financeiro (2026-09-19, SPEC_CAMADA2 2E — "Financeiro em sub-rotas").
    Extraído de `Financeiro.tsx` original pra não duplicar cálculo em
    4 arquivos — Visão Geral, Contas a Receber, Contas a Pagar e DRE
    precisam dos MESMOS `lancamentos`/`dreMeses`/`eventos` e das MESMAS
    contas de saldo/projeção, só cada um mostra um recorte diferente. */
export function useFinanceiro() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [dreMeses, setDreMeses] = useState<DreMes[]>([]);
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [ls, dre, ev] = await Promise.all([listarLancamentos(), listarDreMensal(), listarEventos()]);
      setLancamentos(ls);
      setDreMeses(dre);
      setEventos(ev.filter((e) => e.status !== 'cancelado').sort((a, b) => b.data_evento.localeCompare(a.data_evento)));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function aoCriar(dados: NovoLancamento) {
    setSalvando(true);
    try {
      await criarLancamento(dados);
      await carregar();
      setNovoAberto(false);
    } catch (e) {
      aoFalhar(e);
    } finally {
      setSalvando(false);
    }
  }

  function aoMarcarPago(id: string, pago: boolean) {
    setLancamentos((atual) => atual.map((l) => (l.id === id ? { ...l, status: pago ? 'pago' : 'pendente' } : l)));
    atualizarStatusLancamento(id, pago ? 'pago' : 'pendente')
      .then(() => {
        toast.sucesso(pago ? 'Lançamento marcado como pago.' : 'Lançamento marcado como pendente.', { rotulo: 'Desfazer', callback: () => aoMarcarPago(id, !pago) });
        carregar();
      })
      .catch((e) => {
        aoFalhar(e);
        carregar();
      });
  }

  function aoExcluir(id: string) {
    excluirLancamento(id).then(carregar).catch(aoFalhar);
  }

  const mesAtual = new Date().toISOString().slice(0, 7);

  const vencidos = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    return lancamentos.filter((l) => l.status === 'pendente' && l.vencimento && l.vencimento < hojeStr);
  }, [lancamentos]);
  const idsVencidos = useMemo(() => new Set(vencidos.map((l) => l.id)), [vencidos]);

  const em7diasStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const aReceber = lancamentos.filter((l) => l.tipo === 'receita' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
  const aPagar = lancamentos.filter((l) => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
  const receitaMes = lancamentos.filter((l) => l.tipo === 'receita' && l.status === 'pago' && (l.data_pagamento ?? '').slice(0, 7) === mesAtual).reduce((s, l) => s + l.valor, 0);
  const despesaMes = lancamentos.filter((l) => l.tipo === 'despesa' && l.status === 'pago' && (l.data_pagamento ?? '').slice(0, 7) === mesAtual).reduce((s, l) => s + l.valor, 0);
  const saldoMes = receitaMes - despesaMes;
  const saldoProjetado = receitaMes + aReceber - aPagar;

  return {
    lancamentos,
    dreMeses,
    eventos,
    carregando,
    erro,
    salvando,
    novoAberto,
    setNovoAberto,
    carregar,
    aoCriar,
    aoMarcarPago,
    aoExcluir,
    mesAtual,
    vencidos,
    idsVencidos,
    em7diasStr,
    aReceber,
    aPagar,
    receitaMes,
    despesaMes,
    saldoMes,
    saldoProjetado,
  };
}
