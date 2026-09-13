import { supabase } from '../supabase';
import { FUNCAO_EQUIPE_ROTULO, formatarData, formatarMoeda } from '../status';
import type { EscalaComMembro, EventoComLead } from '../types';

/** Dispara UMA convocação via WhatsApp (template `convocacao_freelancer`,
    ver docs/ROADMAP.md > Fase B) — substitui o "copiar mensagem e colar
    no WhatsApp na mão" que já existia (ver montarMensagemConvocacao,
    ainda usado como fallback/pré-visualização em Escala.tsx). Lança erro
    se o membro não tem telefone cadastrado ou se o disparo falhar —
    quem chama decide se para tudo ou só pula esse membro (ver
    enviarConvocacaoEmLote). */
export async function enviarConvocacaoWhatsapp(escala: EscalaComMembro, evento: EventoComLead): Promise<void> {
  if (!escala.membro) throw new Error('Escala sem membro vinculado.');
  if (!escala.membro.telefone) throw new Error(`${escala.membro.nome} não tem telefone cadastrado.`);

  const detalhes = [
    `📅 Data: ${formatarData(evento.data_evento)}`,
    evento.hora_inicio ? `⏰ Início: ${evento.hora_inicio.slice(0, 5)}` : null,
    evento.local ? `📍 Local: ${evento.local}` : null,
    `🎉 Evento: ${evento.contrato?.lead?.nome ?? 'evento'}`,
    `💰 Diária: ${formatarMoeda(escala.diaria)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
    body: {
      telefone: escala.membro.telefone,
      template: 'convocacao_freelancer',
      parametros: [escala.membro.nome, FUNCAO_EQUIPE_ROTULO[escala.membro.funcao] ?? escala.membro.funcao, detalhes],
    },
  });
  if (error) throw error;
  if (data?.erro) throw new Error(typeof data.erro === 'string' ? data.erro : JSON.stringify(data.erro));
}

export type ResultadoConvocacaoLote = {
  enviados: string[];
  falhas: { nome: string; motivo: string }[];
};

/** Convocação em lote (pedido do usuário, Fase B do roadmap) — dispara
    pra todo mundo escalado num evento de uma vez, em vez de copiar/colar
    uma mensagem por pessoa. Continua mesmo se um membro falhar (ex.: sem
    telefone) — reporta quem deu certo e quem não, nunca aborta o lote
    inteiro por um erro isolado. */
export async function enviarConvocacaoEmLote(escalados: EscalaComMembro[], evento: EventoComLead): Promise<ResultadoConvocacaoLote> {
  const resultado: ResultadoConvocacaoLote = { enviados: [], falhas: [] };
  for (const escala of escalados) {
    const nome = escala.membro?.nome ?? 'membro sem nome';
    try {
      await enviarConvocacaoWhatsapp(escala, evento);
      resultado.enviados.push(nome);
    } catch (e) {
      resultado.falhas.push({ nome, motivo: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultado;
}
