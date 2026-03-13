import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Table } from 'lucide-react';

export class EmbeddingBlock extends BlockDefinition {
  type = 'embedding';
  category = 'layer' as const;
  title = 'Embedding';
  icon = Table;
  params: Record<string, BlockParameter> = {
    num_embeddings: { type: 'int', default: 1000, min: 1, label: 'Vocab Size' },
    embedding_dim: { type: 'int', default: 64, min: 1, label: 'Embedding Dim' },
    padding_idx: { type: 'int', default: 0, min: 0, label: 'Padding Index' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input (indices)', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
