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
  linkConfirmacao,
}: {
  membro: MembroEquipe;
  clienteNome: string;
  dataEvento: string;
  local: string | null;
  horaInicio: string | null;
  diaria: number;
  /** Link único de confirmação (2026-09-14, ver migration_032) — quando
      informado, substitui o antigo "responde com Confirmado" por um
      clique direto, sem precisar do gestor atualizar o status na mão
      depois de ler a resposta. */
  linkConfirmacao?: string | null;
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
    linkConfirmacao
      ? `✅ Confirme (ou avise que não pode) direto por aqui: ${linkConfirmacao}`
      : 'Pode confirmar presença? Responde só com "Confirmado" ou me avisa se não puder. 🥂',
  ];
  return linhas.join('\n\n');
}
