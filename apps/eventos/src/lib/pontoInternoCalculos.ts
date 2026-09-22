import type { FuncionarioInterno, PontoInternoRegistro } from './types';

/* Cálculos do Ponto Interno (horas normais/extras, atraso, valor a pagar e
   grade de presença) — extraídos SEM alteração de `pages/PontoInterno.tsx`
   pra serem usados também pela página do gestor (`PontoInternoEquipe`). */

export function horaCurta(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}

/** Data LOCAL (não UTC) de um timestamp — agrupar por `.slice(0,10)` do
    ISO cru mistura dias errado pra quem bate ponto perto da meia-noite
    em UTC-3 (ex.: 21h de Brasília já é dia seguinte em UTC). */
export function dataLocal(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatarMinutos(min: number): string {
  if (min <= 0) return '—';
  return `${Math.floor(min / 60)}h${Math.round(min % 60) > 0 ? ` ${Math.round(min % 60)}min` : ''}`;
}

export type ResumoJornada = {
  funcionario: FuncionarioInterno;
  minutosNormais: number;
  minutosExtras: number;
  atrasoMin: number;
  diasTrabalhados: number;
  registros: number;
  jornadaConfigurada: boolean;
  valorAPagar: number | null;
};

/** Agrupa por DIA (jornada/hora extra são um conceito diário — "8h hoje
    + 10h ontem" não é "9h extra hoje"), soma pares entrada→saída de cada
    dia (par quebrado, ex. jornada em andamento, simplesmente não soma
    esse dia — não trava o resto), e compara contra a jornada esperada do
    funcionário pra separar normal de extra. Sem jornada configurada,
    tudo conta como "normal" (não dá pra saber o que seria extra) e
    "valorAPagar" fica null. Sem tolerância (decisão do usuário): 1
    minuto além do horário já conta. */
export function calcularResumoJornada(registros: PontoInternoRegistro[], funcionarios: FuncionarioInterno[]): ResumoJornada[] {
  return funcionarios.map((f) => {
    const regs = registros.filter((r) => r.funcionario_id === f.id).sort((a, b) => a.horario.localeCompare(b.horario));

    const porDia = new Map<string, PontoInternoRegistro[]>();
    for (const r of regs) {
      const dia = dataLocal(r.horario);
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push(r);
    }

    const entradaPadraoMin = f.horario_entrada_padrao ? horaParaMinutos(f.horario_entrada_padrao) : null;
    const saidaPadraoMin = f.horario_saida_padrao ? horaParaMinutos(f.horario_saida_padrao) : null;
    const minutosEsperadosDia = entradaPadraoMin != null && saidaPadraoMin != null ? saidaPadraoMin - entradaPadraoMin : null;
    // jornada virada (saída "antes" da entrada, ex. turno noturno cruzando
    // meia-noite) não é suportada ainda — trata como não configurada em
    // vez de gerar hora extra negativa sem sentido.
    const jornadaConfigurada = minutosEsperadosDia != null && minutosEsperadosDia > 0;

    let minutosNormais = 0;
    let minutosExtras = 0;
    let atrasoMin = 0;
    let diasTrabalhados = 0;

    for (const regsDoDia of porDia.values()) {
      const ordenados = regsDoDia.slice().sort((a, b) => a.horario.localeCompare(b.horario));
      let minutosDoDia = 0;
      let i = 0;
      while (i < ordenados.length - 1) {
        if (ordenados[i].tipo === 'entrada' && ordenados[i + 1].tipo === 'saida') {
          minutosDoDia += (new Date(ordenados[i + 1].horario).getTime() - new Date(ordenados[i].horario).getTime()) / 60_000;
          i += 2;
        } else {
          i++;
        }
      }
      if (minutosDoDia <= 0) continue;
      diasTrabalhados++;

      if (jornadaConfigurada) {
        minutosNormais += Math.min(minutosDoDia, minutosEsperadosDia!);
        minutosExtras += Math.max(0, minutosDoDia - minutosEsperadosDia!);
      } else {
        minutosNormais += minutosDoDia;
      }

      if (entradaPadraoMin != null) {
        const primeiraEntrada = ordenados.find((r) => r.tipo === 'entrada');
        if (primeiraEntrada) {
          const d = new Date(primeiraEntrada.horario);
          const minEntrada = d.getHours() * 60 + d.getMinutes();
          if (minEntrada > entradaPadraoMin) atrasoMin += minEntrada - entradaPadraoMin;
        }
      }
    }

    const valorAPagar = f.valor_hora != null ? (minutosNormais / 60) * f.valor_hora + (minutosExtras / 60) * (f.valor_hora_extra ?? f.valor_hora) : null;

    return { funcionario: f, minutosNormais, minutosExtras, atrasoMin, diasTrabalhados, registros: regs.length, jornadaConfigurada, valorAPagar };
  });
}

export type EstadoDiaGrade = 'N' | 'A' | 'E' | 'F';

/** Grade de presença (REVIEW_DECISOES_V2, Parte 12/16, P2) — um estado
    por funcionário/dia: N=normal, A=atraso (bateu entrada depois do
    horário padrão), E=trabalhou mais que a jornada esperada, F=sem
    registro nenhum naquele dia. Sem um "—=folga" (mockup do documento
    tem esse 5º estado): o sistema não tem cadastro de dias de folga
    por funcionário, e feriados de fim de semana não servem de proxy
    aqui — evento é fim de semana, é quando MAIS gente desta equipe
    trabalha. Marcar sábado/domingo como folga seria inventar um dado
    errado pro próprio negócio. */
export function calcularGradePresenca(registros: PontoInternoRegistro[], funcionarios: FuncionarioInterno[], dias: string[]): Map<string, Map<string, EstadoDiaGrade>> {
  const porFuncionario = new Map<string, Map<string, EstadoDiaGrade>>();
  for (const f of funcionarios) {
    const regsF = registros.filter((r) => r.funcionario_id === f.id);
    const porDia = new Map<string, PontoInternoRegistro[]>();
    for (const r of regsF) {
      const d = dataLocal(r.horario);
      if (!porDia.has(d)) porDia.set(d, []);
      porDia.get(d)!.push(r);
    }
    const entradaPadraoMin = f.horario_entrada_padrao ? horaParaMinutos(f.horario_entrada_padrao) : null;
    const saidaPadraoMin = f.horario_saida_padrao ? horaParaMinutos(f.horario_saida_padrao) : null;
    const minutosEsperados = entradaPadraoMin != null && saidaPadraoMin != null && saidaPadraoMin > entradaPadraoMin ? saidaPadraoMin - entradaPadraoMin : null;

    const estados = new Map<string, EstadoDiaGrade>();
    for (const dia of dias) {
      const regsDoDia = (porDia.get(dia) ?? []).slice().sort((a, b) => a.horario.localeCompare(b.horario));
      if (regsDoDia.length === 0) {
        estados.set(dia, 'F');
        continue;
      }
      let minutosDoDia = 0;
      let i = 0;
      while (i < regsDoDia.length - 1) {
        if (regsDoDia[i].tipo === 'entrada' && regsDoDia[i + 1].tipo === 'saida') {
          minutosDoDia += (new Date(regsDoDia[i + 1].horario).getTime() - new Date(regsDoDia[i].horario).getTime()) / 60_000;
          i += 2;
        } else i++;
      }
      let atrasado = false;
      if (entradaPadraoMin != null) {
        const primeiraEntrada = regsDoDia.find((r) => r.tipo === 'entrada');
        if (primeiraEntrada) {
          const d = new Date(primeiraEntrada.horario);
          if (d.getHours() * 60 + d.getMinutes() > entradaPadraoMin) atrasado = true;
        }
      }
      estados.set(dia, atrasado ? 'A' : minutosEsperados != null && minutosDoDia > minutosEsperados ? 'E' : 'N');
    }
    porFuncionario.set(f.id, estados);
  }
  return porFuncionario;
}
