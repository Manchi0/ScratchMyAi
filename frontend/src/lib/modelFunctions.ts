// Helper to hit the FastAPI /models endpoints for trained models.
import { supabase } from './supabase';

export interface LayerWeightData {
  shape: number[];
  stats: { min: number; max: number; mean: number; std: number };
  sample: number[];   // 240 values (12 rows × 20 cols)
  rows: number;
  cols: number;
}

export interface ModelWeightsResponse {
  layers: Record<string, LayerWeightData>;  // keyed by sequential index "0","1",...
}

export interface TrainedModelSummary {
  id: string;
  name: string;
  dataset: string;
  accuracy: number | null;
  created_at: string;
}

export interface TrainedModelMeta {
  accuracy: number | null;
  loss: number | null;
  epochs: number | null;
  training_time_seconds: number | null;
}

export async function getTrainedModelMeta(modelId: string): Promise<TrainedModelMeta> {
  const { data, error } = await supabase
    .from('trained_models')
    .select('accuracy, loss, epochs, training_time_seconds')
    .eq('id', modelId)
    .single();
  if (error) throw error;
  return data as TrainedModelMeta;
}

export async function listTrainedModels(userId: string): Promise<TrainedModelSummary[]> {
  const { data, error } = await supabase
    .from('trained_models')
    .select('id, name, dataset, accuracy, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteTrainedModel(modelId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const res = await fetch(`http://localhost:8000/models/${modelId}`, {
      method: 'DELETE',
      headers: {
          'Authorization': `Bearer ${session?.access_token}`
      }
  });
  
  if (!res.ok) {
      throw new Error(`Failed to delete model: ${res.status}`);
  }
}

export async function getModelWeights(modelId: string): Promise<ModelWeightsResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`http://localhost:8000/models/${modelId}/weights`, {
    headers: { 'Authorization': `Bearer ${session?.access_token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `weights request failed: ${res.status}`);
  }

  return res.json() as Promise<ModelWeightsResponse>;
}

export async function predictModel(modelId: string, inputData: any[]): Promise<any[]> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch(`http://localhost:8000/models/${modelId}/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
           input_data: inputData
        })
    });
    
    if (!res.ok) {
        throw new Error(`Inference returned ${res.status}`);
    }
    
    const json = await res.json();
    return json.output;
}
