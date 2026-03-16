import type { Edge, Node } from '@xyflow/react';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export type AssistantProvider = 'claude' | 'openai';

export interface AssistantMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface GraphSnapshot {
  title: string;
  dataset: string;
  nodes: Node[];
  edges: Edge[];
  training_config: {
    loss: string;
    optimizer: string;
    learning_rate: number;
    epochs: number;
  };
}

export interface AssistantChatRequest {
  provider: AssistantProvider;
  message: string;
  history: AssistantMessagePayload[];
  graph: GraphSnapshot;
}

interface AssistantChatResponse {
  provider: AssistantProvider;
  model: string;
  reply: string;
}

export async function askAssistant(payload: AssistantChatRequest): Promise<AssistantChatResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_BASE_URL}/models/assistant/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Assistant request failed: ${res.status}`;
    try {
      const errorBody = await res.json();
      if (errorBody?.detail) {
        detail = String(errorBody.detail);
      }
    } catch {
      // Fallback to status text when no JSON payload is returned.
      if (res.statusText) {
        detail = res.statusText;
      }
    }
    throw new Error(detail);
  }

  return (await res.json()) as AssistantChatResponse;
}
