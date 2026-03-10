import { supabase } from './supabase';
import type { Node, Edge } from '@xyflow/react';

export interface WorkflowRow {
  id: string;
  user_id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowSummary {
  id: string;
  title: string;
  updated_at: string;
}

/** Insert a new workflow or update an existing one. Returns the row id. */
export async function saveWorkflow(
  userId: string,
  data: {
    id?: string | null;
    title: string;
    nodes: Node[];
    edges: Edge[];
  }
): Promise<string> {
  if (data.id) {
    // UPDATE existing
    const { error } = await supabase
      .from('graphs')
      .update({ title: data.title, nodes: data.nodes, edges: data.edges })
      .eq('id', data.id);

    if (error) throw error;
    return data.id;
  } else {
    // INSERT new
    const { data: row, error } = await supabase
      .from('graphs')
      .insert({
        user_id: userId,
        title: data.title,
        nodes: data.nodes as unknown as Record<string, unknown>[],
        edges: data.edges as unknown as Record<string, unknown>[],
      })
      .select('id')
      .single();

    if (error) throw error;
    return row.id;
  }
}

/** Fetch a single workflow by id. */
export async function loadWorkflow(id: string): Promise<WorkflowRow> {
  const { data, error } = await supabase
    .from('graphs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as WorkflowRow;
}

/** List all workflows for a user (lightweight — no nodes/edges). */
export async function listWorkflows(userId: string): Promise<WorkflowSummary[]> {
  const { data, error } = await supabase
    .from('graphs')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as WorkflowSummary[];
}

/** Delete a single workflow. */
export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase
    .from('graphs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
