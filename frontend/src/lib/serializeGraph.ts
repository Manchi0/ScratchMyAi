import { Node, Edge } from '@xyflow/react';

export interface BackendGraphSchema {
  dataset: string;
  layers: LayerConfig[];
  connections: ConnectionConfig[];
  training_config: TrainingConfig;
}

export interface LayerConfig {
  id: string;
  type: string;
  [key: string]: any; // Allow arbitrary parameters like in_features, out_features, etc.
}

export interface ConnectionConfig {
  from: string;
  to: string;
}

export interface TrainingConfig {
  loss: string;
  optimizer: string;
  learning_rate: number;
  epochs: number;
}

export function serializeGraph(nodes: Node[], edges: Edge[], trainingConfig: TrainingConfig): BackendGraphSchema {
  // Find the dataset node (assuming there's only one input for the MVP)
  const datasetNode = nodes.find(n => n.type === 'neuralBlock' && (n.data.blockType as string)?.toLowerCase() === 'dataset');
  const datasetParams = (datasetNode?.data?.params as Record<string, any>) || {};
  const datasetSource = datasetParams?.dataset_source as string || 'mnist';

  const layers: LayerConfig[] = [];
  const connections: ConnectionConfig[] = [];

  // Map nodes to layers
  nodes.forEach(node => {
    if (node.type !== 'neuralBlock') return;
    
    const blockType = (node.data.blockType as string)?.toLowerCase();
    if (!blockType) return;

    // We treat dataset as a special property, not a layer in the backend compiler
    if (blockType === 'dataset') return;

    // Flatten params to the root of the layer object
    const params = (node.data.params as Record<string, any>) || {};
    
    layers.push({
      id: node.id,
      type: blockType,
      ...params,
    });
  });

  // Map edges to connections
  edges.forEach(edge => {
    // We ignore edges originating from the dataset node since it's not a generic layer
    if (edge.source === datasetNode?.id) return;
    
    connections.push({
      from: edge.source,
      to: edge.target,
    });
  });

  return {
    dataset: datasetSource,
    layers,
    connections,
    training_config: trainingConfig
  };
}
