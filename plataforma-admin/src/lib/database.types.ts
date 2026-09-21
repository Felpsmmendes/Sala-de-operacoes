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
          criado_em?: string;
        };
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
