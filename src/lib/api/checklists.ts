import { supabase } from '../supabase';
import type { ChecklistEventoCompleto, ChecklistTemplate, ChecklistTemplateCompleto } from '../types';

/* -------------------- Templates -------------------- */

export async function listarTemplates(): Promise<ChecklistTemplateCompleto[]> {
  const { data, error } = await supabase.from('checklist_templates').select('*, itens:checklist_template_itens(*)').order('nome');
  if (error) throw new Error(error.message);
  return (data as unknown as ChecklistTemplateCompleto[]).map((t) => ({ ...t, itens: t.itens.slice().sort((a, b) => a.ordem - b.ordem) }));
}

export async function criarTemplate(nome: string, descricao: string | null): Promise<ChecklistTemplate> {
  const { data, error } = await supabase.from('checklist_templates').insert({ nome, descricao }).select().single();
  if (error) throw new Error(error.message);
  return data as ChecklistTemplate;
}

export async function excluirTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adicionarItemTemplate(templateId: string, descricao: string, quantidade: number, ordem: number): Promise<void> {
  const { error } = await supabase.from('checklist_template_itens').insert({ template_id: templateId, descricao, quantidade, ordem });
  if (error) throw new Error(error.message);
}

export async function removerItemTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_template_itens').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------- Checklists aplicados a um evento -------------------- */

export async function listarChecklistsDoEvento(eventoId: string): Promise<ChecklistEventoCompleto[]> {
  const { data, error } = await supabase.from('checklist_evento').select('*, itens:checklist_evento_itens(*)').eq('evento_id', eventoId).order('criado_em');
  if (error) throw new Error(error.message);
  return (data as unknown as ChecklistEventoCompleto[]).map((c) => ({ ...c, itens: c.itens.slice().sort((a, b) => a.ordem - b.ordem) }));
}

/** Cria a checklist do evento — quando `templateId` é passado, copia os
    itens do template pra dentro dela (cópia, não referência: editar/
    marcar aqui depois nunca muda o template original). */
export async function criarChecklistEvento(eventoId: string, nome: string, templateId: string | null): Promise<void> {
  const { data: checklist, error: erroChecklist } = await supabase.from('checklist_evento').insert({ evento_id: eventoId, nome, template_id: templateId }).select().single();
  if (erroChecklist) throw new Error(erroChecklist.message);

  if (templateId) {
    const { data: itensTemplate, error: erroItens } = await supabase.from('checklist_template_itens').select('*').eq('template_id', templateId).order('ordem');
    if (erroItens) throw new Error(erroItens.message);
    if (itensTemplate && itensTemplate.length > 0) {
      const { error: erroInsert } = await supabase
        .from('checklist_evento_itens')
        .insert(itensTemplate.map((i) => ({ checklist_evento_id: checklist.id, descricao: i.descricao, quantidade: i.quantidade, ordem: i.ordem })));
      if (erroInsert) throw new Error(erroInsert.message);
    }
  }
}

export async function excluirChecklistEvento(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_evento').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adicionarItemEvento(checklistEventoId: string, descricao: string, quantidade: number, ordem: number): Promise<void> {
  const { error } = await supabase.from('checklist_evento_itens').insert({ checklist_evento_id: checklistEventoId, descricao, quantidade, ordem });
  if (error) throw new Error(error.message);
}

export async function removerItemEvento(id: string): Promise<void> {
  const { error } = await supabase.from('checklist_evento_itens').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function marcarItemConcluido(id: string, concluido: boolean): Promise<void> {
  const { error } = await supabase
    .from('checklist_evento_itens')
    .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
