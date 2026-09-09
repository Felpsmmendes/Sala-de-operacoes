/** Tipos de domínio — espelham `supabase/schema.sql`. Mantidos à mão por
    enquanto (ver nota em database.types.ts sobre gerar isso de verdade). */

/** Antes era um union fixo de 5 valores (CHECK no banco). Virou dinâmico —
    cada lead aponta pro `id` de um `funis_lead` (FK), que o usuário pode
    criar/renomear/reordenar/excluir pela tela do Pipeline. */
export type StatusLead = string;

export type PapelFunil = 'novo' | 'ganho' | 'perdido';

export type FunilLead = {
  id: string;
  nome: string;
  cor: 'sucesso' | 'pendente' | 'perigo' | 'neutro';
  ordem: number;
  papel: PapelFunil | null;
  criado_em: string;
};

export type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  status: StatusLead;
  valor_estimado: number | null;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type NovoLead = Pick<Lead, 'nome'> & Partial<Omit<Lead, 'id' | 'nome' | 'criado_em' | 'atualizado_em'>>;

export type TipoInteracao = 'mensagem_whatsapp' | 'ligacao' | 'email' | 'reuniao' | 'nota';

export type LeadInteracao = {
  id: string;
  lead_id: string;
  tipo: TipoInteracao;
  conteudo: string;
  criado_em: string;
};

export type CategoriaServico = 'bar' | 'atracao' | 'adicional';

export type Servico = {
  id: string;
  categoria: CategoriaServico;
  nome: string;
  descricao: string | null;
  valor_base: number;
  valor_por_convidado: number | null;
  ativo: boolean;
  /** Texto comercial pro Gerador de Mensagens (Orçamentos) — separado da
      `descricao` curta acima (usada nos cards/PDF) porque a mensagem
      pro cliente precisa de um parágrafo de venda de verdade, não uma
      legenda de uma linha. Ver supabase/migration_011_copy_comercial_servicos.sql
      — texto real, migrado do painel anterior, não inventado. Nullable:
      serviço sem isso preenchido cai de volta na `descricao` curta. */
  mensagem_descricao: string | null;
  mensagem_horas: string | null;
  mensagem_informacoes: string | null;
};

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

export type Orcamento = {
  id: string;
  lead_id: string;
  data_evento: string | null;
  convidados: number | null;
  valor_total: number;
  valor_sinal: number;
  valor_saldo: number;
  status: StatusOrcamento;
  criado_em: string;
  /** Frete cobrado do cliente (2026-09-09, ver migration_019) — região e
      veículo só ficam salvos pra reabrir a edição mostrando a escolha
      certa; o custo/valor cobrado NÃO recalcula sozinho se o preço da
      região mudar depois (mesmo raciocínio de `valor_unitario` nos itens).
      `valor_frete_cobrado` (com margem) já está somado em `valor_total`.
      `valor_frete_custo` (sem margem) vira despesa em Finanças só quando
      este orçamento virar contrato — ver criarContrato em api/contratos.ts. */
  regiao_frete_id: string | null;
  veiculo_id: string | null;
  valor_frete_cobrado: number;
  valor_frete_custo: number;
};

export type OrcamentoItem = {
  id: string;
  orcamento_id: string;
  servico_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  /** Hora adicional (ver migration_014): quantas horas além da duração
      padrão do serviço (5h bar / 4h atração) e quanto vale cada uma —
      já somadas em `valor_unitario` no momento em que o orçamento foi
      montado. `valor_hora_adicional` fica 0 pra serviços sem esse
      conceito (ex.: categoria "adicional"). */
  horas_adicionais: number;
  valor_hora_adicional: number;
  /** Horário de início desta atração no dia do evento (2026-09-09, ver
      migration_021) — só faz sentido pra itens de categoria 'atracao';
      preenchido na tela de Contratos, não no Gerador de Orçamentos. */
  horario_inicio_atracao: string | null;
};

export type OrcamentoComLead = Orcamento & { lead: Pick<Lead, 'id' | 'nome' | 'telefone'> | null };
export type OrcamentoCompleto = OrcamentoComLead & { itens: (OrcamentoItem & { servico: Servico })[] };

export type StatusSaldo = 'pendente' | 'parcial' | 'quitado';
export type StatusContrato = 'ativo' | 'cancelado' | 'concluido';
export type FormaPagamento = 'pix' | 'boleto' | 'cartao';

export type Contrato = {
  id: string;
  orcamento_id: string | null;
  lead_id: string;
  data_evento: string;
  local: string | null;
  convidados: number | null;
  valor_total: number;
  valor_sinal: number;
  sinal_pago: boolean;
  sinal_pago_em: string | null;
  valor_saldo: number;
  saldo_status: StatusSaldo;
  saldo_pago_em: string | null;
  chave_pix: string | null;
  status: StatusContrato;
  criado_em: string;
  atualizado_em: string;
  /** Registro manual de qual forma foi usada (2026-09-09, ver
      migration_020) — não gera boleto/link de pagamento real, isso fica
      pra uma integração futura com o Asaas. */
  forma_pagamento: FormaPagamento | null;
  /** Texto livre — cada quebra de linha deve virar um item extra no
      checklist de carga do evento. Conexão com o checklist AINDA NÃO
      EXISTE (depende de uma etapa de Estoque que o usuário chamou de
      "Etapa 7", que não existe no código nem no ROADMAP.md hoje) — só
      o campo está pronto por enquanto. */
  observacoes_brindes: string | null;
  /** Horários do evento (2026-09-09, ver migration_021) — pensados pro
      Roteiro do Evento ("Etapa 8", ainda não construída) consumir
      depois. Os 4 primeiros valem pra qualquer contrato; `horario_inicio_bar`
      só faz sentido quando o contrato tem algum item de categoria 'bar'
      no orçamento de origem (contrato criado do zero, sem orçamento,
      nunca mostra esse campo). Horário de cada atração fica em
      `OrcamentoItem.horario_inicio_atracao` (um por item, não aqui). */
  horario_chegada_convidados: string | null;
  horario_chegada_equipe: string | null;
  horario_fim_servico: string | null;
  horario_saida_equipe: string | null;
  horario_inicio_bar: string | null;
};

export type ContratoComLead = Contrato & { lead: Pick<Lead, 'id' | 'nome' | 'telefone'> | null };

export type StatusEvento = 'agendado' | 'em_montagem' | 'em_execucao' | 'encerrado' | 'cancelado';

export type Evento = {
  id: string;
  contrato_id: string;
  data_evento: string;
  hora_inicio: string | null;
  hora_fim_prevista: string | null;
  local: string | null;
  tipo_evento: string | null;
  convidados: number | null;
  status: StatusEvento;
  canal_radio: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type EventoComLead = Evento & { contrato: { id: string; orcamento_id: string | null; lead: Pick<Lead, 'id' | 'nome' | 'telefone'> | null } | null };

/* -------------------- Núcleo 2: Planejamento -------------------- */

export type FuncaoEquipe = 'head_bartender' | 'bartender' | 'barback' | 'tecnico_imagem' | 'motorista' | 'outro';

export type MembroEquipe = {
  id: string;
  nome: string;
  funcao: FuncaoEquipe;
  telefone: string | null;
  chave_pix: string | null;
  ativo: boolean;
};

export type NovoMembroEquipe = Omit<MembroEquipe, 'id'>;

export type StatusEscala = 'convocado' | 'confirmado' | 'recusado';

export type Escala = {
  id: string;
  evento_id: string;
  membro_id: string;
  diaria: number;
  status: StatusEscala;
  confirmado_em: string | null;
  traje_ok: boolean;
  epi_ok: boolean;
};

export type EscalaComMembro = Escala & { membro: MembroEquipe | null };

export type TipoVeiculo = 'caminhao' | 'sedan' | 'van';

export type Veiculo = {
  id: string;
  nome: string;
  placa: string | null;
  tipo: TipoVeiculo;
  consumo_medio: number | null;
  km_atual: number | null;
};

export type NovoVeiculo = Omit<Veiculo, 'id'>;

/** Região de frete (2026-09-09) — cadastro livre do gestor pra alimentar
    a calculadora de frete sem digitar o km na mão toda vez (ver
    supabase/migration_017_regioes_frete.sql). `km_aproximado` é a
    distância de IDA — a calculadora dobra pra ida+volta. */
export type RegiaoFrete = {
  id: string;
  nome: string;
  km_aproximado: number;
  criado_em: string;
};

export type NovaRegiaoFrete = Omit<RegiaoFrete, 'id' | 'criado_em'>;

/** Item extra no checklist de carga, vindo de uma linha de
    `Contrato.observacoes_brindes` (2026-09-09, ver migration_022) —
    quantidade começa em 1 e é editável na tela de Estoque. */
export type ChecklistExtraItem = {
  id: string;
  contrato_id: string;
  descricao: string;
  quantidade: number;
  criado_em: string;
};

export type ChecklistPadraoItem = {
  id: string;
  servico_id: string;
  convidados_min: number | null;
  convidados_max: number | null;
  descricao: string;
  quantidade: number;
  unidade: string | null;
};

/* -------------------- Núcleo 3: Execução em Tempo Real -------------------- */

export type OrigemCue = 'manual' | 'automatico';

export type CueSheetItem = {
  id: string;
  evento_id: string;
  numero: number;
  horario: string;
  titulo: string;
  descricao: string | null;
  concluido: boolean;
  concluido_em: string | null;
  /** 'automatico' = gerado a partir dos horários do contrato (2026-09-09,
      "Etapa 8", ver migration_023) — nunca apagado sozinho, só criado/
      atualizado. 'manual' = criado pelo gestor pela tela, como sempre. */
  origem: OrigemCue;
};

/** Linha da view `vw_escala_presenca` — usada tanto pela tela pública de
    check-in (`/ponto/:eventoId`, sem login) quanto pelo painel do gestor.
    Nunca inclui `diaria` (dado de pagamento) por design da view. */
export type EscalaPresenca = {
  escala_id: string;
  evento_id: string;
  membro_id: string;
  membro_nome: string;
  membro_funcao: FuncaoEquipe;
  status_escala: StatusEscala;
  data_evento: string;
  local: string | null;
  chegada_em: string | null;
};

/* -------------------- Núcleo 4: Encerramento & Auditoria -------------------- */

export type AuditoriaPosEvento = {
  id: string;
  evento_id: string;
  sobras_reintegradas: boolean;
  avarias_descricao: string | null;
  avarias_valor: number | null;
  foto_doca_url: string | null;
  nps_nota: number | null;
  nps_comentario: string | null;
  criado_em: string;
};

export type DadosAuditoria = Omit<AuditoriaPosEvento, 'id' | 'evento_id' | 'criado_em'>;

/* -------------------- Núcleo 5: Controladoria & Saúde Financeira -------------------- */

export type TipoLancamento = 'receita' | 'despesa';
export type StatusLancamento = 'pendente' | 'pago';

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  evento_id: string | null;
  descricao: string;
  valor: number;
  vencimento: string | null;
  status: StatusLancamento;
  data_pagamento: string | null;
  observacoes: string | null;
  criado_em: string;
};

export type NovoLancamento = {
  tipo: TipoLancamento;
  eventoId: string | null;
  descricao: string;
  valor: number;
  vencimento: string | null;
  observacoes: string | null;
};

/** Linha da view `dre_mensal` (agregação de `lancamentos_financeiros` já
    pagos, por mês — nunca uma tabela própria, pra não duplicar dado). */
export type DreMes = {
  mes: string;
  receita_bruta: number;
  custos_totais: number;
  lucro_liquido: number;
};

/* -------------------- Núcleo 4 (revisitado): Portal do Cliente -------------------- */

export type PortalCliente = {
  id: string;
  contrato_id: string;
  token: string;
  coquetel_ids: string[];
  moldura_arquivo_url: string | null;
  moldura_aprovada: boolean;
  video_arquivo_url: string | null;
  video_aprovado: boolean;
  assinatura_nome: string | null;
  assinatura_cpf: string | null;
  assinatura_hash: string | null;
  assinatura_ip: string | null;
  assinatura_em: string | null;
  criado_em: string;
};

/** Linha da view `vw_portal_publico` — usada pela tela pública
    (`/portal/:token`, sem login). Nunca inclui valor_total/sinal/saldo/
    chave_pix do contrato, só o necessário pro cliente reconhecer o
    evento certo. */
export type PortalPublico = Omit<PortalCliente, 'assinatura_ip' | 'assinatura_hash' | 'criado_em'> & {
  data_evento: string;
  local: string | null;
  lead_nome: string;
};

/* -------------------- Ponto Eletrônico interno (funcionários fixos) --------------------
   Diferente do check-in de freelancer por evento (Escala/EscalaPresenca,
   sem login): aqui `id` = o próprio `auth.users.id` da conta (login de
   verdade, criada manualmente pelo gestor no Supabase — self-signup
   continua desligado). Ver supabase/migration_010_ponto_interno.sql. */

export type TipoPontoInterno = 'entrada' | 'saida';

export type FuncionarioInterno = {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
};

export type PontoInternoRegistro = {
  id: string;
  funcionario_id: string;
  tipo: TipoPontoInterno;
  horario: string;
};

/* -------------------- Tarefas da Agenda (lembretes livres, sem contrato) --------------------
   `eventos` sempre nasce de um contrato (contrato_id not null — 1:1,
   automático) — não dá pra criar um evento solto na Agenda. Tarefa é o
   oposto: um lembrete rápido preso só numa data, sem exigir contrato
   nenhum (ex.: "ligar pro fornecedor X"), pensado pra suprir exatamente
   isso no calendário. Ver supabase/migration_012_tarefas_agenda.sql. */

export type TarefaAgenda = {
  id: string;
  titulo: string;
  data: string;
  horario: string | null;
  concluida: boolean;
  observacoes: string | null;
  /** Lead relacionado (ex.: degustação marcada com um cliente) — opcional,
      ver migration_013_tarefa_lead.sql. Ao criar com lead_id, a tarefa
      também vira uma interação (`lead_interacoes`, tipo "reuniao") no
      histórico de conversa desse lead, pro CRM refletir sozinho. */
  lead_id: string | null;
  criado_em: string;
};

export type TarefaComLead = TarefaAgenda & { lead: Pick<Lead, 'id' | 'nome'> | null };

export type NovaTarefaAgenda = { titulo: string; data: string; horario: string | null; observacoes: string | null; leadId: string | null };

/* -------------------- Bloqueio de data (2026-09-09) --------------------
   Diferente de tarefa (lembrete livre): marca que uma data — ou
   intervalo — está reservada por outro motivo, sem estar ligado a lead
   nenhum. Ver migration_024_bloqueios_agenda.sql. */

export type CategoriaBloqueio = 'degustacao' | 'reuniao_interna' | 'reserva_evento' | 'outro';

export type BloqueioAgenda = {
  id: string;
  categoria: CategoriaBloqueio;
  observacao: string | null;
  data_inicio: string;
  data_fim: string;
  criado_em: string;
};

export type NovoBloqueioAgenda = { categoria: CategoriaBloqueio; observacao: string | null; dataInicio: string; dataFim: string };
