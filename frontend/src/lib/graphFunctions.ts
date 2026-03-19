import { supabase } from './supabase';
import type { Node, Edge } from '@xyflow/react';
import type { TrainingConfig } from './serializeGraph';

export interface GraphRow {
  id: string;
  user_id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  training_config?: TrainingConfig;
  course_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraphSummary {
  id: string;
  title: string;
  updated_at: string;
  course_id?: string | null;
  nodes?: Node[];
  edges?: Edge[];
}

/** Insert a new graph or update an existing one. Returns the row id. */
export async function saveGraph(
  userId: string,
  data: {
    id?: string | null;
    title: string;
    nodes: Node[];
    edges: Edge[];
    trainingConfig?: TrainingConfig;
    courseId?: string | null;
  }
): Promise<string> {
  if (data.id) {
    // UPDATE existing
    const { error } = await supabase
      .from('graphs')
      .update({ 
        title: data.title, 
        nodes: data.nodes, 
        edges: data.edges,
        training_config: data.trainingConfig,
        course_id: data.courseId
      })
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
        training_config: data.trainingConfig as unknown as Record<string, unknown>,
        course_id: data.courseId
      })
      .select('id')
      .single();

    if (error) throw error;
    return row.id;
  }
}

/** Fetch a single graph by id. */
export async function loadGraph(id: string): Promise<GraphRow> {
  const { data, error } = await supabase
    .from('graphs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as GraphRow;
}

/** List all graphs for a user (lightweight — no nodes/edges). */
export async function listGraphs(userId: string): Promise<GraphSummary[]> {
  const { data, error } = await supabase
    .from('graphs')
    .select('id, title, updated_at, course_id, nodes, edges')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as GraphSummary[];
}

/** Delete a single graph. */
export async function deleteGraph(id: string): Promise<void> {
  const { error } = await supabase
    .from('graphs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
