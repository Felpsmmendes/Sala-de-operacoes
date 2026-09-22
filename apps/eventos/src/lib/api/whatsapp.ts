import { supabase } from '../supabase';
import { montarLinkConfirmacao } from './confirmacaoEscala';
import { FUNCAO_EQUIPE_ROTULO, formatarData, formatarMoeda } from '../status';
import type { EscalaComMembro, EventoComLead, MensagemWhatsapp } from '../types';

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
    `✅ Confirme (ou avise que não pode) direto por aqui: ${montarLinkConfirmacao(escala.token)}`,
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

export type StatusWhatsapp = {
  configurado: boolean;
  valido: boolean;
  numero?: string | null;
  nomeVerificado?: string | null;
  qualidade?: string | null;
  erro?: string;
};

/** Status da conexão oficial (Meta) — nunca vê o token, só pergunta pra
    Edge Function `whatsapp-status` (ver lá) se está configurado e ainda
    válido junto à Meta. Usado pela aba "Conectar WhatsApp" do CRM. */
export async function verificarStatusWhatsapp(): Promise<StatusWhatsapp> {
  const { data, error } = await supabase.functions.invoke('whatsapp-status');
  if (error) throw error;
  return data as StatusWhatsapp;
}

/** Conecta (ou troca) o número do WhatsApp — grava em `integracao_whatsapp`
    (ver migration_031, 2026-09-14: antes disso só dava pra configurar
    via `supabase secrets set`; agora o gestor conecta/desconecta pela
    própria tela, útil quando a empresa trocar de número). O token nunca
    é lido de volta por aqui — só as Edge Functions leem, com a service
    role. */
export async function conectarWhatsapp(phoneNumberId: string, accessToken: string): Promise<void> {
  const { error } = await supabase.from('integracao_whatsapp').upsert({ id: 'atual', phone_number_id: phoneNumberId, access_token: accessToken, conectado_em: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function desconectarWhatsapp(): Promise<void> {
  const { error } = await supabase.from('integracao_whatsapp').delete().eq('id', 'atual');
  if (error) throw new Error(error.message);
}

/** Credenciais do webhook de RECEBIMENTO (ver supabase/functions/
    whatsapp-webhook) — separado de `conectarWhatsapp` (envio) porque são
    passos diferentes na configuração da Meta e o gestor pode preencher
    em momentos diferentes. `appSecret` é opcional (null = sem verificação
    de assinatura, ver comentário na Edge Function). */
export async function salvarConfigWebhook(verifyToken: string, appSecret: string | null): Promise<void> {
  const { error } = await supabase.from('integracao_whatsapp').update({ webhook_verify_token: verifyToken, app_secret: appSecret || null }).eq('id', 'atual');
  if (error) throw new Error(error.message);
}

/** Histórico de mensagens de um lead (migration mensagens_whatsapp_webhook,
    2026-09-22) — só existe mensagem `recebida` de verdade a partir de
    quando o webhook for configurado na Meta; antes disso a lista vem
    sempre vazia (não é bug, é a realidade: sem webhook não tem como
    saber o que o cliente mandou). */
export async function listarMensagensWhatsappDoLead(leadId: string): Promise<MensagemWhatsapp[]> {
  const { data, error } = await supabase.from('mensagens_whatsapp').select('*').eq('lead_id', leadId).order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as MensagemWhatsapp[];
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
