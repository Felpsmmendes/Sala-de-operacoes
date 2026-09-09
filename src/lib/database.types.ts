/**
 * Tipos do banco (Supabase) — gerados à mão a partir de
 * `supabase/schema.sql` + `supabase/migration_00[2-9]_*.sql` (fonte da
 * verdade do schema), porque este ambiente não tem um token de acesso à
 * API de administração do Supabase pra rodar o gerador oficial contra o
 * projeto remoto. Assim que tiver o token à mão, troque este arquivo pelo
 * gerado de verdade (mesma forma — nada no resto do código muda):
 *
 *   npx supabase gen types typescript --project-id ugnworqdnensqfzrxahk > src/lib/database.types.ts
 *
 * Até lá isso substitui o placeholder antigo (`Database = any`), que
 * deixava qualquer nome de tabela/coluna errado passar batido no
 * `supabase.from(...)` — foi exatamente essa lacuna que escondeu, sem dar
 * erro de compilação, o bug real da Fase 4c (`escalas.criado_em`
 * inexistente, só descoberto em teste manual — ver docs/ROADMAP.md).
 *
 * `src/lib/types.ts` continua sendo o tipo de domínio usado pela UI
 * (nomes/uniões mais estreitas, ex. `StatusEscala` em vez de `string`) —
 * este arquivo aqui é só o espelho cru do banco que o `SupabaseClient`
 * genérico enxerga.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      funis_lead: {
        Row: { id: string; nome: string; cor: string; ordem: number; papel: string | null; criado_em: string };
        Insert: { id: string; nome: string; cor?: string; ordem: number; papel?: string | null; criado_em?: string };
        Update: { id?: string; nome?: string; cor?: string; ordem?: number; papel?: string | null; criado_em?: string };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          nome: string;
          telefone: string | null;
          email: string | null;
          origem: string | null;
          status: string;
          valor_estimado: number | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone?: string | null;
          email?: string | null;
          origem?: string | null;
          status?: string;
          valor_estimado?: number | null;
          observacoes?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          telefone?: string | null;
          email?: string | null;
          origem?: string | null;
          status?: string;
          valor_estimado?: number | null;
          observacoes?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      lead_interacoes: {
        Row: { id: string; lead_id: string; tipo: string; conteudo: string; criado_em: string };
        Insert: { id?: string; lead_id: string; tipo: string; conteudo: string; criado_em?: string };
        Update: { id?: string; lead_id?: string; tipo?: string; conteudo?: string; criado_em?: string };
        Relationships: [];
      };
      servicos: {
        Row: {
          id: string;
          categoria: string;
          nome: string;
          descricao: string | null;
          valor_base: number;
          valor_por_convidado: number | null;
          ativo: boolean;
          mensagem_descricao: string | null;
          mensagem_horas: string | null;
          mensagem_informacoes: string | null;
        };
        Insert: {
          id?: string;
          categoria: string;
          nome: string;
          descricao?: string | null;
          valor_base: number;
          valor_por_convidado?: number | null;
          ativo?: boolean;
          mensagem_descricao?: string | null;
          mensagem_horas?: string | null;
          mensagem_informacoes?: string | null;
        };
        Update: {
          id?: string;
          categoria?: string;
          nome?: string;
          descricao?: string | null;
          valor_base?: number;
          valor_por_convidado?: number | null;
          ativo?: boolean;
          mensagem_descricao?: string | null;
          mensagem_horas?: string | null;
          mensagem_informacoes?: string | null;
        };
        Relationships: [];
      };
      orcamentos: {
        Row: {
          id: string;
          lead_id: string;
          data_evento: string | null;
          convidados: number | null;
          valor_total: number;
          valor_sinal: number;
          valor_saldo: number;
          status: string;
          criado_em: string;
          regiao_frete_id: string | null;
          veiculo_id: string | null;
          valor_frete_cobrado: number;
          valor_frete_custo: number;
        };
        Insert: {
          id?: string;
          lead_id: string;
          data_evento?: string | null;
          convidados?: number | null;
          valor_total?: number;
          status?: string;
          criado_em?: string;
          regiao_frete_id?: string | null;
          veiculo_id?: string | null;
          valor_frete_cobrado?: number;
          valor_frete_custo?: number;
        };
        Update: {
          id?: string;
          lead_id?: string;
          data_evento?: string | null;
          convidados?: number | null;
          valor_total?: number;
          status?: string;
          criado_em?: string;
          regiao_frete_id?: string | null;
          veiculo_id?: string | null;
          valor_frete_cobrado?: number;
          valor_frete_custo?: number;
        };
        Relationships: [];
      };
      orcamento_itens: {
        Row: {
          id: string;
          orcamento_id: string;
          servico_id: string;
          quantidade: number;
          valor_unitario: number;
          valor_total: number;
          horas_adicionais: number;
          valor_hora_adicional: number;
          horario_inicio_atracao: string | null;
        };
        Insert: {
          id?: string;
          orcamento_id: string;
          servico_id: string;
          quantidade?: number;
          valor_unitario: number;
          horas_adicionais?: number;
          valor_hora_adicional?: number;
          horario_inicio_atracao?: string | null;
        };
        Update: {
          id?: string;
          orcamento_id?: string;
          servico_id?: string;
          quantidade?: number;
          valor_unitario?: number;
          horas_adicionais?: number;
          valor_hora_adicional?: number;
          horario_inicio_atracao?: string | null;
        };
        Relationships: [];
      };
      contratos: {
        Row: {
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
          saldo_status: string;
          saldo_pago_em: string | null;
          chave_pix: string | null;
          status: string;
          criado_em: string;
          atualizado_em: string;
          forma_pagamento: string | null;
          observacoes_brindes: string | null;
          horario_chegada_convidados: string | null;
          horario_chegada_equipe: string | null;
          horario_fim_servico: string | null;
          horario_saida_equipe: string | null;
          horario_inicio_bar: string | null;
        };
        Insert: {
          id?: string;
          orcamento_id?: string | null;
          lead_id: string;
          data_evento: string;
          local?: string | null;
          convidados?: number | null;
          valor_total: number;
          sinal_pago?: boolean;
          sinal_pago_em?: string | null;
          saldo_status?: string;
          saldo_pago_em?: string | null;
          chave_pix?: string | null;
          status?: string;
          criado_em?: string;
          atualizado_em?: string;
          forma_pagamento?: string | null;
          observacoes_brindes?: string | null;
          horario_chegada_convidados?: string | null;
          horario_chegada_equipe?: string | null;
          horario_fim_servico?: string | null;
          horario_saida_equipe?: string | null;
          horario_inicio_bar?: string | null;
        };
        Update: {
          id?: string;
          orcamento_id?: string | null;
          lead_id?: string;
          data_evento?: string;
          local?: string | null;
          convidados?: number | null;
          valor_total?: number;
          sinal_pago?: boolean;
          sinal_pago_em?: string | null;
          saldo_status?: string;
          saldo_pago_em?: string | null;
          chave_pix?: string | null;
          status?: string;
          criado_em?: string;
          atualizado_em?: string;
          forma_pagamento?: string | null;
          observacoes_brindes?: string | null;
          horario_chegada_convidados?: string | null;
          horario_chegada_equipe?: string | null;
          horario_fim_servico?: string | null;
          horario_saida_equipe?: string | null;
          horario_inicio_bar?: string | null;
        };
        Relationships: [];
      };
      portal_cliente: {
        Row: {
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
        Insert: {
          id?: string;
          contrato_id: string;
          token?: string;
          coquetel_ids?: string[];
          moldura_arquivo_url?: string | null;
          moldura_aprovada?: boolean;
          video_arquivo_url?: string | null;
          video_aprovado?: boolean;
          assinatura_nome?: string | null;
          assinatura_cpf?: string | null;
          assinatura_hash?: string | null;
          assinatura_ip?: string | null;
          assinatura_em?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          contrato_id?: string;
          token?: string;
          coquetel_ids?: string[];
          moldura_arquivo_url?: string | null;
          moldura_aprovada?: boolean;
          video_arquivo_url?: string | null;
          video_aprovado?: boolean;
          assinatura_nome?: string | null;
          assinatura_cpf?: string | null;
          assinatura_hash?: string | null;
          assinatura_ip?: string | null;
          assinatura_em?: string | null;
          criado_em?: string;
        };
        Relationships: [];
      };
      estoque_itens: {
        Row: {
          id: string;
          nome: string;
          categoria: string;
          unidade: string;
          estoque_atual: number;
          estoque_minimo: number;
          consumo_por_pax: number | null;
          atualizado_em: string;
        };
        Insert: { id?: string; nome: string; categoria: string; unidade: string; estoque_atual?: number; estoque_minimo?: number; consumo_por_pax?: number | null; atualizado_em?: string };
        Update: { id?: string; nome?: string; categoria?: string; unidade?: string; estoque_atual?: number; estoque_minimo?: number; consumo_por_pax?: number | null; atualizado_em?: string };
        Relationships: [];
      };
      estoque_movimentos: {
        Row: { id: string; item_id: string; tipo: string; quantidade: number; evento_id: string | null; observacao: string | null; criado_em: string };
        Insert: { id?: string; item_id: string; tipo: string; quantidade: number; evento_id?: string | null; observacao?: string | null; criado_em?: string };
        Update: { id?: string; item_id?: string; tipo?: string; quantidade?: number; evento_id?: string | null; observacao?: string | null; criado_em?: string };
        Relationships: [];
      };
      compras: {
        Row: { id: string; item_id: string; quantidade: number; valor_total: number; status: string; criado_em: string; data_chegada_prevista: string | null };
        Insert: { id?: string; item_id: string; quantidade: number; valor_total: number; status?: string; criado_em?: string; data_chegada_prevista?: string | null };
        Update: { id?: string; item_id?: string; quantidade?: number; valor_total?: number; status?: string; criado_em?: string; data_chegada_prevista?: string | null };
        Relationships: [];
      };
      equipe: {
        Row: { id: string; nome: string; funcao: string; telefone: string | null; chave_pix: string | null; ativo: boolean };
        Insert: { id?: string; nome: string; funcao: string; telefone?: string | null; chave_pix?: string | null; ativo?: boolean };
        Update: { id?: string; nome?: string; funcao?: string; telefone?: string | null; chave_pix?: string | null; ativo?: boolean };
        Relationships: [];
      };
      veiculos: {
        Row: { id: string; nome: string; placa: string | null; tipo: string; consumo_medio: number | null; km_atual: number | null };
        Insert: { id?: string; nome: string; placa?: string | null; tipo: string; consumo_medio?: number | null; km_atual?: number | null };
        Update: { id?: string; nome?: string; placa?: string | null; tipo?: string; consumo_medio?: number | null; km_atual?: number | null };
        Relationships: [];
      };
      eventos: {
        Row: {
          id: string;
          contrato_id: string;
          data_evento: string;
          hora_inicio: string | null;
          hora_fim_prevista: string | null;
          local: string | null;
          tipo_evento: string | null;
          convidados: number | null;
          status: string;
          canal_radio: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          contrato_id: string;
          data_evento: string;
          hora_inicio?: string | null;
          hora_fim_prevista?: string | null;
          local?: string | null;
          tipo_evento?: string | null;
          convidados?: number | null;
          status?: string;
          canal_radio?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          contrato_id?: string;
          data_evento?: string;
          hora_inicio?: string | null;
          hora_fim_prevista?: string | null;
          local?: string | null;
          tipo_evento?: string | null;
          convidados?: number | null;
          status?: string;
          canal_radio?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      escalas: {
        Row: { id: string; evento_id: string; membro_id: string; diaria: number; status: string; confirmado_em: string | null; traje_ok: boolean; epi_ok: boolean };
        Insert: { id?: string; evento_id: string; membro_id: string; diaria: number; status?: string; confirmado_em?: string | null; traje_ok?: boolean; epi_ok?: boolean };
        Update: { id?: string; evento_id?: string; membro_id?: string; diaria?: number; status?: string; confirmado_em?: string | null; traje_ok?: boolean; epi_ok?: boolean };
        Relationships: [];
      };
      cue_sheet_itens: {
        Row: { id: string; evento_id: string; numero: number; horario: string; titulo: string; descricao: string | null; concluido: boolean; concluido_em: string | null; origem: string };
        Insert: {
          id?: string;
          evento_id: string;
          numero: number;
          horario: string;
          titulo: string;
          descricao?: string | null;
          concluido?: boolean;
          concluido_em?: string | null;
          origem?: string;
        };
        Update: {
          id?: string;
          evento_id?: string;
          numero?: number;
          horario?: string;
          titulo?: string;
          descricao?: string | null;
          concluido?: boolean;
          concluido_em?: string | null;
          origem?: string;
        };
        Relationships: [];
      };
      checklist_padrao_itens: {
        Row: {
          id: string;
          servico_id: string;
          convidados_min: number | null;
          convidados_max: number | null;
          descricao: string;
          quantidade: number;
          unidade: string | null;
          estoque_item_id: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          servico_id: string;
          convidados_min?: number | null;
          convidados_max?: number | null;
          descricao: string;
          quantidade?: number;
          unidade?: string | null;
          estoque_item_id?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          servico_id?: string;
          convidados_min?: number | null;
          convidados_max?: number | null;
          descricao?: string;
          quantidade?: number;
          unidade?: string | null;
          estoque_item_id?: string | null;
          criado_em?: string;
        };
        Relationships: [];
      };
      contrato_checklist_extra: {
        Row: { id: string; contrato_id: string; descricao: string; quantidade: number; criado_em: string };
        Insert: { id?: string; contrato_id: string; descricao: string; quantidade?: number; criado_em?: string };
        Update: { id?: string; contrato_id?: string; descricao?: string; quantidade?: number; criado_em?: string };
        Relationships: [];
      };
      bloqueios_agenda: {
        Row: { id: string; categoria: string; observacao: string | null; data_inicio: string; data_fim: string; criado_em: string };
        Insert: { id?: string; categoria: string; observacao?: string | null; data_inicio: string; data_fim: string; criado_em?: string };
        Update: { id?: string; categoria?: string; observacao?: string | null; data_inicio?: string; data_fim?: string; criado_em?: string };
        Relationships: [];
      };
      regioes_frete: {
        Row: { id: string; nome: string; km_aproximado: number; criado_em: string };
        Insert: { id?: string; nome: string; km_aproximado: number; criado_em?: string };
        Update: { id?: string; nome?: string; km_aproximado?: number; criado_em?: string };
        Relationships: [];
      };
      ponto_registros: {
        Row: {
          id: string;
          membro_id: string;
          evento_id: string;
          tipo: string;
          horario: string;
          latitude: number | null;
          longitude: number | null;
          distancia_metros: number | null;
          dentro_geocerca: boolean;
        };
        Insert: {
          id?: string;
          membro_id: string;
          evento_id: string;
          tipo: string;
          horario?: string;
          latitude?: number | null;
          longitude?: number | null;
          distancia_metros?: number | null;
          dentro_geocerca?: boolean;
        };
        Update: {
          id?: string;
          membro_id?: string;
          evento_id?: string;
          tipo?: string;
          horario?: string;
          latitude?: number | null;
          longitude?: number | null;
          distancia_metros?: number | null;
          dentro_geocerca?: boolean;
        };
        Relationships: [];
      };
      auditoria_pos_evento: {
        Row: {
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
        Insert: {
          id?: string;
          evento_id: string;
          sobras_reintegradas?: boolean;
          avarias_descricao?: string | null;
          avarias_valor?: number | null;
          foto_doca_url?: string | null;
          nps_nota?: number | null;
          nps_comentario?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          evento_id?: string;
          sobras_reintegradas?: boolean;
          avarias_descricao?: string | null;
          avarias_valor?: number | null;
          foto_doca_url?: string | null;
          nps_nota?: number | null;
          nps_comentario?: string | null;
          criado_em?: string;
        };
        Relationships: [];
      };
      tarefas_agenda: {
        Row: { id: string; titulo: string; data: string; horario: string | null; concluida: boolean; observacoes: string | null; lead_id: string | null; criado_em: string };
        Insert: {
          id?: string;
          titulo: string;
          data: string;
          horario?: string | null;
          concluida?: boolean;
          observacoes?: string | null;
          lead_id?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          data?: string;
          horario?: string | null;
          concluida?: boolean;
          observacoes?: string | null;
          lead_id?: string | null;
          criado_em?: string;
        };
        Relationships: [];
      };
      funcionarios_internos: {
        Row: { id: string; nome: string; ativo: boolean; criado_em: string };
        Insert: { id: string; nome: string; ativo?: boolean; criado_em?: string };
        Update: { id?: string; nome?: string; ativo?: boolean; criado_em?: string };
        Relationships: [];
      };
      ponto_interno_registros: {
        Row: { id: string; funcionario_id: string; tipo: string; horario: string };
        Insert: { id?: string; funcionario_id: string; tipo: string; horario?: string };
        Update: { id?: string; funcionario_id?: string; tipo?: string; horario?: string };
        Relationships: [];
      };
      lancamentos_financeiros: {
        Row: {
          id: string;
          tipo: string;
          evento_id: string | null;
          descricao: string;
          valor: number;
          vencimento: string | null;
          status: string;
          data_pagamento: string | null;
          observacoes: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          tipo: string;
          evento_id?: string | null;
          descricao: string;
          valor: number;
          vencimento?: string | null;
          status?: string;
          data_pagamento?: string | null;
          observacoes?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          tipo?: string;
          evento_id?: string | null;
          descricao?: string;
          valor?: number;
          vencimento?: string | null;
          status?: string;
          data_pagamento?: string | null;
          observacoes?: string | null;
          criado_em?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      dre_mensal: {
        Row: { mes: string; receita_bruta: number | null; custos_totais: number | null; lucro_liquido: number | null };
        Relationships: [];
      };
      vw_escala_presenca: {
        Row: {
          escala_id: string;
          evento_id: string;
          membro_id: string;
          membro_nome: string;
          membro_funcao: string;
          status_escala: string;
          data_evento: string;
          local: string | null;
          chegada_em: string | null;
        };
        Relationships: [];
      };
      vw_portal_publico: {
        Row: {
          id: string;
          token: string;
          contrato_id: string;
          coquetel_ids: string[];
          moldura_arquivo_url: string | null;
          moldura_aprovada: boolean;
          video_arquivo_url: string | null;
          video_aprovado: boolean;
          assinatura_nome: string | null;
          assinatura_cpf: string | null;
          assinatura_em: string | null;
          data_evento: string;
          local: string | null;
          lead_nome: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      eh_gestor: { Args: Record<string, never>; Returns: boolean };
      portal_obter: { Args: { p_token: string }; Returns: Database['public']['Views']['vw_portal_publico']['Row'][] };
      portal_aprovar_moldura: { Args: { p_token: string }; Returns: undefined };
      portal_aprovar_video: { Args: { p_token: string }; Returns: undefined };
      portal_assinar: { Args: { p_token: string; p_nome: string; p_cpf: string; p_hash: string }; Returns: undefined };
      ponto_obter_presenca: { Args: { p_evento_id: string }; Returns: Database['public']['Views']['vw_escala_presenca']['Row'][] };
      ponto_registrar_chegada: { Args: { p_evento_id: string; p_membro_id: string }; Returns: undefined };
      /** ver supabase/migration_009_estoque_atomico.sql */
      estoque_registrar_movimento: {
        Args: { p_item_id: string; p_tipo: string; p_quantidade: number; p_evento_id: string | null; p_observacao: string | null };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
