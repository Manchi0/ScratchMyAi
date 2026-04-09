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

  description = "A lookup table that maps integer token IDs to dense floating-point vectors. Each unique integer (e.g., a word index) is converted to a trainable vector of size embedding_dim, which the model learns during training.";
  whenToUse = "Use as the very first layer in any NLP or sequence model, right after the Dataset block. The num_embeddings must be at least as large as your vocabulary size (the maximum token ID + 1). Typical embedding_dim values are 64–512; larger embeddings carry more information but use more memory.";
  commonMistakes = [
    "Setting num_embeddings smaller than the largest token index in your dataset — this causes an IndexError at runtime.",
    "Using a very small embedding_dim (e.g., 8) for complex language tasks — small embeddings lack the capacity to encode rich semantic information.",
    "Forgetting that Embedding outputs float tensors even though its input is integer indices — downstream layers receive floats, not ints.",
  ];
  pytorchClass = "nn.Embedding";
}
