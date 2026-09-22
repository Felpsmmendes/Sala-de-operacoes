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
      legenda de uma linha. Ver supabase/migrations/20260101000010_011_copy_comercial_servicos.sql
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

export type OrcamentoComLead = Orcamento & { lead: Pick<Lead, 'id' | 'nome' | 'telefone' | 'email'> | null };
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
  /* -------------------- Documento de contrato (2026-09-13) --------------------
     Texto jurídico do contrato — separado do registro financeiro acima.
     `documento_texto` é HTML (gerado a partir de um template e editado
     livremente pelo gestor); a assinatura do CLIENTE nessas colunas é um
     evento DIFERENTE da assinatura de homologação de mídia (que fica em
     `portal_cliente.assinatura_*`) — ver migration_028. */
  tipo_contrato: TipoContrato | null;
  documento_texto: string | null;
  documento_gerado_em: string | null;
  contrato_assinatura_nome: string | null;
  contrato_assinatura_cpf: string | null;
  contrato_assinado_em: string | null;
};

export type TipoContrato = 'bar_service' | 'photo_booth' | 'combo';

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

/** 1 linha por dia marcado (2026-09-19, ver migration_036) — dia sem
    linha é disponível por padrão; só existe registro quando o gestor
    mexeu explicitamente naquele dia. */
export type DisponibilidadeMembro = {
  id: string;
  membro_id: string;
  data: string;
  disponivel: boolean;
  observacao: string | null;
  criado_em: string;
};

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
  /** Token aleatório pro link público de confirmação (2026-09-14, ver
      migration_032) — 1 por linha de escala, ou seja, 1 por pessoa por
      evento/contrato. Nunca muda depois de gerado. */
  token: string;
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

/** Vínculo veículo↔evento (migration_035, 2026-09-19) — many-to-many:
    um evento pode precisar de mais de um veículo. */
export type AlocacaoVeiculo = {
  id: string;
  evento_id: string;
  veiculo_id: string;
  criado_em: string;
};

/** Região de frete (2026-09-09) — cadastro livre do gestor pra alimentar
    a calculadora de frete sem digitar o km na mão toda vez (ver
    supabase/migrations/20260101000016_017_regioes_frete.sql). `km_aproximado` é a
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

/* -------------------- Checklists como módulo (2026-09-19, SPEC_CAMADA2 2F,
   ver migration_037) — checklist de PROCESSO (montagem/desmontagem/
   procedimento), diferente do checklist de CARGA acima (ligado a
   serviço/contrato pra saber O QUE LEVAR). Template + itens do template,
   instância aplicada num evento + itens da instância. -------------------- */

export type ChecklistTemplate = {
  id: string;
  nome: string;
  descricao: string | null;
  criado_em: string;
};

export type ChecklistTemplateItem = {
  id: string;
  template_id: string;
  descricao: string;
  quantidade: number;
  ordem: number;
};

export type ChecklistTemplateCompleto = ChecklistTemplate & { itens: ChecklistTemplateItem[] };

export type ChecklistEvento = {
  id: string;
  evento_id: string;
  template_id: string | null;
  nome: string;
  criado_em: string;
};

export type ChecklistEventoItem = {
  id: string;
  checklist_evento_id: string;
  descricao: string;
  quantidade: number;
  concluido: boolean;
  concluido_em: string | null;
  ordem: number;
};

export type ChecklistEventoCompleto = ChecklistEvento & { itens: ChecklistEventoItem[] };

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

/** Linha da view `vw_confirmacao_escala` (2026-09-14, ver migration_032)
    — usada pela tela pública `/confirmar/:token`. Ao contrário de
    `EscalaPresenca`, inclui a diária: só quem tem o token de UMA linha
    específica enxerga essa linha (nunca lista geral), então mostrar o
    valor pro próprio freelancer decidir é seguro aqui. */
export type ConfirmacaoEscala = {
  escala_id: string;
  token: string;
  evento_id: string;
  membro_id: string;
  membro_nome: string;
  membro_funcao: FuncaoEquipe;
  diaria: number;
  status: StatusEscala;
  confirmado_em: string | null;
  data_evento: string;
  hora_inicio: string | null;
  local: string | null;
  cliente_nome: string;
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
  /** Texto livre (2026-09-14, ver migration_034) — "Bar Service", "Equipe",
      "Frete" etc.; a UI sugere via datalist, mas nunca trava num enum
      fixo. null nos lançamentos criados antes desta coluna existir. */
  categoria: string | null;
};

export type NovoLancamento = {
  tipo: TipoLancamento;
  eventoId: string | null;
  descricao: string;
  valor: number;
  vencimento: string | null;
  observacoes: string | null;
  categoria?: string | null;
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
  /** Quando o cliente abriu o link pela 1ª vez, e quantas vezes no total
      (2026-09-14, ver migration_033) — null/0 = ainda não abriu. */
  aberto_em: string | null;
  visualizacoes: number;
};

/** Linha da view `vw_portal_publico` — usada pela tela pública
    (`/portal/:token`, sem login). Nunca inclui valor_total/sinal/saldo/
    chave_pix do contrato, só o necessário pro cliente reconhecer o
    evento certo. */
export type PortalPublico = Omit<PortalCliente, 'assinatura_ip' | 'assinatura_hash' | 'criado_em' | 'aberto_em' | 'visualizacoes'> & {
  data_evento: string;
  local: string | null;
  lead_nome: string;
  /** Documento de contrato + status da assinatura DO CONTRATO (evento
      diferente de `assinatura_*` acima, que é a homologação de mídia —
      ver comentário em `Contrato`, migration_028). */
  tipo_contrato: TipoContrato | null;
  documento_texto: string | null;
  contrato_assinatura_nome: string | null;
  contrato_assinado_em: string | null;
};

/* -------------------- Ponto Eletrônico interno (funcionários fixos) --------------------
   Diferente do check-in de freelancer por evento (Escala/EscalaPresenca,
   sem login): aqui `id` = o próprio `auth.users.id` da conta (login de
   verdade, criada manualmente pelo gestor no Supabase — self-signup
   continua desligado). Ver supabase/migrations/20260101000009_010_ponto_interno.sql. */

/** Allowlist de contas com acesso total (2026-09-13, ver migration_030 —
    Fase E do roadmap, resiliência: antes disso era 1 UUID travado direto
    no SQL, sem tabela nenhuma). Gerenciar quem entra aqui continua
    manual pelo SQL Editor de propósito (ver comentário na migration) —
    esta tela só LÊ, pra dar visibilidade de quem tem acesso hoje. */
export type Gestor = {
  id: string;
  nome: string | null;
  criado_em: string;
};

/* -------------------- Multiempresa (2026-09-21) --------------------
   Fundação de tenant — Etapa 1 do plano de evolução pra SaaS multiempresa
   (ver documento de auditoria). `gestores` acima continua existindo e
   sendo a fonte de verdade de "eh_gestor()" por enquanto; estes dois
   tipos só espelham as tabelas novas (migration_039/040), ainda não
   substituem nada. */
export type PlanoEmpresa = 'essencial' | 'profissional' | 'enterprise';
export type StatusEmpresa = 'ativa' | 'trial' | 'suspensa' | 'manutencao';

/** Identificador de módulo — mesmo conjunto de rotas reais de
    `NUCLEOS` (Layout.tsx). Só guarda a configuração por empresa
    (migration_042); nenhuma tela ainda LÊ isso pra esconder/mostrar
    módulo de verdade — é fundação da Fase 6, não a entrega completa. */
export type ModuloPlataforma =
  | 'crm'
  | 'orcamentos'
  | 'contratos'
  | 'agenda'
  | 'escala'
  | 'estoque'
  | 'logistica'
  | 'roteiro'
  | 'ponto'
  | 'ponto_interno'
  | 'financeiro'
  | 'fechamento'
  | 'auditoria'
  | 'portal_cliente';

export type Empresa = {
  id: string;
  nome: string;
  slug: string;
  plano: PlanoEmpresa;
  status: StatusEmpresa;
  /** MRR/cobrança — digitado manualmente pelo super admin, sem gateway
      de pagamento real por trás (ver comentário na migration_042). */
  mrr: number;
  proxima_cobranca: string | null;
  ultimo_pagamento_em: string | null;
  saude: number;
  modulos_ativos: ModuloPlataforma[];
  observacoes: string | null;
  criado_em: string;
};

export type PapelMembroEmpresa = 'admin';

export type MembroEmpresa = {
  id: string;
  empresa_id: string;
  user_id: string;
  papel: PapelMembroEmpresa;
  criado_em: string;
};

// `SuperAdmin`/`LeadPlataforma`/etc (painel da plataforma) não moram mais
// aqui — o painel virou um app separado (`plataforma-admin/`, decisão do
// usuário em 2026-09-21) com seu próprio `src/lib/types.ts`. Este app só
// precisa de `Empresa`/`MembroEmpresa` acima, pra `AuthContext.empresaAtual`.

export type TipoPontoInterno = 'entrada' | 'saida';

export type FuncionarioInterno = {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
  /* -------------------- Jornada + valor/hora (2026-09-13) --------------------
     Config opcional pro relatório de horas calcular atraso/hora extra e
     quanto pagar — null em qualquer campo = "ainda não configurado pra
     esta pessoa", nunca um valor inventado (ver migration_029). */
  horario_entrada_padrao: string | null;
  horario_saida_padrao: string | null;
  valor_hora: number | null;
  valor_hora_extra: number | null;
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
   isso no calendário. Ver supabase/migrations/20260101000011_012_tarefas_agenda.sql. */

export type TarefaAgenda = {
  id: string;
  titulo: string;
  data: string;
  horario: string | null;
  concluida: boolean;
  observacoes: string | null;
  /** Lead relacionado (ex.: degustação marcada com um cliente) — opcional,
      ver 20260101000012_013_tarefa_lead.sql. Ao criar com lead_id, a tarefa
      também vira uma interação (`lead_interacoes`, tipo "reuniao") no
      histórico de conversa desse lead, pro CRM refletir sozinho. */
  lead_id: string | null;
  criado_em: string;
};

export type TarefaComLead = TarefaAgenda & { lead: Pick<Lead, 'id' | 'nome'> | null };

export type NovaTarefaAgenda = { titulo: string; data: string; horario: string | null; observacoes: string | null; leadId: string | null };

/* -------------------- Automações do CRM (2026-09-13) --------------------
   Editor visual em fluxo (canvas, tipo Zapier/n8n — pedido explícito do
   usuário pra substituir a v1 de "1 gatilho + 1 ação por regra"). Cada
   `FluxoAutomacao` é um grafo: nós (`NoFluxo`) ligados por conexões
   (`ConexaoFluxo`), desenhado e editado em AutomacoesCrm.tsx/
   FluxoCanvas.tsx. Um fluxo sempre tem exatamente 1 nó `gatilho` (a
   entrada) e daí em diante qualquer sequência de `condicao`/`espera`/
   `acao`. Execução é stateful — ver ResultadoAutomacoes e
   src/lib/api/automacoes.ts: uma automação pode ficar "parada, esperando
   até dia X" num nó de espera, e só um cron consegue retomá-la depois. */
export type NoTipo = 'gatilho' | 'condicao' | 'espera' | 'acao';
export type GatilhoAutomacao = 'tempo_sem_contato' | 'mudanca_funil' | 'lead_criado';
export type CondicaoCampo = 'origem' | 'tem_telefone';
export type AcaoAutomacao = 'mover_funil' | 'registrar_nota' | 'criar_tarefa' | 'enviar_whatsapp';

/** Config específica do tipo do nó — todos os campos opcionais porque só
    o subconjunto relevante ao `tipo` do nó é preenchido (ver NoFluxo). */
export type NoDados = {
  // gatilho — tempo_sem_contato: gatilho_funil_id null = qualquer funil
  // "em negociação". mudanca_funil: gatilho_funil_id é o funil de
  // destino que dispara. lead_criado: gatilho_origem null = qualquer
  // origem.
  gatilho_tipo?: GatilhoAutomacao;
  gatilho_funil_id?: string | null;
  gatilho_dias?: number | null;
  gatilho_origem?: string | null;
  // espera — pausa o fluxo por N dias antes de seguir pro próximo nó.
  espera_dias?: number;
  // condicao — 2 saídas (conexões com origem_handle 'sim'/'nao').
  condicao_campo?: CondicaoCampo;
  condicao_valor?: string;
  // acao
  acao_tipo?: AcaoAutomacao;
  acao_funil_destino_id?: string | null;
  /** registrar_nota: texto da nota. criar_tarefa: título da tarefa.
      enviar_whatsapp: corpo/parâmetro variável da mensagem. */
  acao_texto?: string | null;
  /** só criar_tarefa — cria a tarefa pra "hoje + N dias". */
  acao_dias_prazo?: number | null;
  /** só enviar_whatsapp — nome do template aprovado na Meta. */
  acao_whatsapp_template?: string | null;
};

export type NoFluxo = {
  id: string;
  fluxo_id: string;
  tipo: NoTipo;
  pos_x: number;
  pos_y: number;
  dados: NoDados;
};

/** origem_handle diferencia as 2 saídas de um nó `condicao` — null pra
    qualquer outro tipo de nó (só tem 1 saída). */
export type ConexaoFluxo = {
  id: string;
  fluxo_id: string;
  origem_no_id: string;
  destino_no_id: string;
  origem_handle: 'sim' | 'nao' | null;
};

export type FluxoAutomacao = {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
};

export type FluxoCompleto = FluxoAutomacao & { nos: NoFluxo[]; conexoes: ConexaoFluxo[] };

/* -------------------- Bloqueio de data (2026-09-09) --------------------
   Diferente de tarefa (lembrete livre): marca que uma data — ou
   intervalo — está reservada por outro motivo, sem estar ligado a lead
   nenhum. Ver 20260101000023_024_bloqueios_agenda.sql. */

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

/* -------------------- Monitoramento de erros do app (2026-09-19, ver migration_038) -------------------- */

export type OrigemErro = 'janela' | 'promessa' | 'react' | 'toast';

export type ErroApp = {
  id: string;
  criado_em: string;
  origem: OrigemErro;
  mensagem: string;
  stack: string | null;
  rota: string | null;
  user_agent: string | null;
  usuario_id: string | null;
};
