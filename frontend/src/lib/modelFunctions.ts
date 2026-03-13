// Helper to hit the FastAPI /models endpoints for trained models.
import { supabase } from './supabase';

export interface TrainedModelSummary {
  id: string;
  name: string;
  dataset: string;
  accuracy: number | null;
  created_at: string;
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
