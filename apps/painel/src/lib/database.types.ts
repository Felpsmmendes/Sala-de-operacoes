/**
 * Tipos do banco — só o subconjunto que este app usa (empresas,
 * super_admins, leads_plataforma*). Mesmo Supabase do app principal
 * (../src/lib/database.types.ts tem o schema inteiro); gerados à mão
 * pelo mesmo motivo documentado lá — sem token de admin da API do
 * Supabase neste ambiente pra rodar `supabase gen types`.
 */

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          plano: string;
          status: string;
          mrr: number;
          proxima_cobranca: string | null;
          ultimo_pagamento_em: string | null;
          saude: number;
          modulos_ativos: string[];
          observacoes: string | null;
          url_sistema: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          plano?: string;
          status?: string;
          mrr?: number;
          proxima_cobranca?: string | null;
          ultimo_pagamento_em?: string | null;
          saude?: number;
          modulos_ativos?: string[];
          observacoes?: string | null;
          url_sistema?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          slug?: string;
          plano?: string;
          status?: string;
          mrr?: number;
          proxima_cobranca?: string | null;
          ultimo_pagamento_em?: string | null;
          saude?: number;
          modulos_ativos?: string[];
          observacoes?: string | null;
          url_sistema?: string | null;
          criado_em?: string;
        };
        Relationships: [];
      };
      etapas_plataforma: {
        Row: { id: string; nome: string; ordem: number; papel: string | null; criado_em: string };
        Insert: { id: string; nome: string; ordem?: number; papel?: string | null; criado_em?: string };
        Update: { id?: string; nome?: string; ordem?: number; papel?: string | null; criado_em?: string };
        Relationships: [];
      };
      planos_plataforma: {
        Row: { chave: string; nome: string; preco_mensal: number; modulos: string[]; atualizado_em: string };
        Insert: { chave: string; nome: string; preco_mensal?: number; modulos?: string[]; atualizado_em?: string };
        Update: { chave?: string; nome?: string; preco_mensal?: number; modulos?: string[]; atualizado_em?: string };
        Relationships: [];
      };
      chamados_plataforma: {
        Row: { id: string; empresa_id: string; titulo: string; descricao: string | null; modulo: string | null; prioridade: string; status: string; responsavel: string | null; criado_em: string; atualizado_em: string; resolvido_em: string | null };
        Insert: { id?: string; empresa_id: string; titulo: string; descricao?: string | null; modulo?: string | null; prioridade?: string; status?: string; responsavel?: string | null; criado_em?: string; atualizado_em?: string; resolvido_em?: string | null };
        Update: { id?: string; empresa_id?: string; titulo?: string; descricao?: string | null; modulo?: string | null; prioridade?: string; status?: string; responsavel?: string | null; criado_em?: string; atualizado_em?: string; resolvido_em?: string | null };
        Relationships: [];
      };
      chamados_plataforma_comentarios: {
        Row: { id: string; chamado_id: string; autor: string | null; conteudo: string; criado_em: string };
        Insert: { id?: string; chamado_id: string; autor?: string | null; conteudo: string; criado_em?: string };
        Update: { id?: string; chamado_id?: string; autor?: string | null; conteudo?: string; criado_em?: string };
        Relationships: [];
      };
      cobrancas_plataforma: {
        Row: { id: string; empresa_id: string; descricao: string; tipo: string; valor: number; vencimento: string; status: string; pago_em: string | null; criado_em: string };
        Insert: { id?: string; empresa_id: string; descricao: string; tipo?: string; valor: number; vencimento: string; status?: string; pago_em?: string | null; criado_em?: string };
        Update: { id?: string; empresa_id?: string; descricao?: string; tipo?: string; valor?: number; vencimento?: string; status?: string; pago_em?: string | null; criado_em?: string };
        Relationships: [];
      };
      super_admins: {
        Row: { id: string; nome: string | null; criado_em: string };
        Insert: { id: string; nome?: string | null; criado_em?: string };
        Update: { id?: string; nome?: string | null; criado_em?: string };
        Relationships: [];
      };
      leads_plataforma: {
        Row: {
          id: string;
          nome_empresa: string;
          contato_nome: string | null;
          contato_telefone: string | null;
          contato_email: string | null;
          origem: string | null;
          etapa: string;
          plano_interesse: string | null;
          valor_potencial: number | null;
          observacoes: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome_empresa: string;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          contato_email?: string | null;
          origem?: string | null;
          etapa?: string;
          plano_interesse?: string | null;
          valor_potencial?: number | null;
          observacoes?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome_empresa?: string;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          contato_email?: string | null;
          origem?: string | null;
          etapa?: string;
          plano_interesse?: string | null;
          valor_potencial?: number | null;
          observacoes?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [];
      };
      leads_plataforma_interacoes: {
        Row: { id: string; lead_id: string; tipo: string; conteudo: string; criado_em: string };
        Insert: { id?: string; lead_id: string; tipo: string; conteudo: string; criado_em?: string };
        Update: { id?: string; lead_id?: string; tipo?: string; conteudo?: string; criado_em?: string };
        Relationships: [
          {
            foreignKeyName: 'leads_plataforma_interacoes_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'leads_plataforma';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      eh_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
