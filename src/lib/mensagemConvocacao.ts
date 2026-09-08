import type { MembroEquipe } from './types';
import { FUNCAO_EQUIPE_ROTULO, formatarData, formatarMoeda } from './status';

/** Mensagem de convocação por WhatsApp — sem integração de envio automático
    (não temos API de WhatsApp Business), então o fluxo real é: gera o
    texto aqui, copia, cola e manda manualmente pro freelancer. */
export function montarMensagemConvocacao({
  membro,
  clienteNome,
  dataEvento,
  local,
  horaInicio,
  diaria,
}: {
  membro: MembroEquipe;
  clienteNome: string;
  dataEvento: string;
  local: string | null;
  horaInicio: string | null;
  diaria: number;
}): string {
  const linhas = [
    `Oi, ${membro.nome}! Tudo bem? 😊`,
    `Aqui é da Em Cena Eventos. Temos uma convocação pra você como *${FUNCAO_EQUIPE_ROTULO[membro.funcao] ?? membro.funcao}*:`,
    [
      `📅 Data: ${formatarData(dataEvento)}`,
      horaInicio ? `⏰ Início: ${horaInicio}` : null,
      local ? `📍 Local: ${local}` : null,
      `🎉 Evento: ${clienteNome}`,
      `💰 Diária: ${formatarMoeda(diaria)}`,
    ]
      .filter(Boolean)
      .join('\n'),
    'Lembrete: traje All Black completo + EPIs (avental, bota de proteção, crachá).',
    'Pode confirmar presença? Responde só com "Confirmado" ou me avisa se não puder. 🥂',
  ];
  return linhas.join('\n\n');
}
