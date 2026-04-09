import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { MapPin } from 'lucide-react';

export class PositionalEncodingBlock extends BlockDefinition {
  type = 'positionalencoding';
  category = 'layer' as const;
  title = 'Positional Encoding';
  icon = MapPin;
  params: Record<string, BlockParameter> = {
    d_model: { type: 'int', default: 64, min: 1, label: 'D Model' },
    max_len: { type: 'int', default: 512, min: 1, label: 'Max Length' },
    dropout: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Dropout' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Injects positional information into a sequence of embeddings using fixed sinusoidal patterns. Since transformers process all tokens simultaneously and have no inherent sense of order, this block makes each position distinguishable.";
  whenToUse = "Always use immediately after an Embedding block and before any Self-Attention or TransformerEncoderLayer blocks. The d_model must exactly match the embedding_dim of the preceding Embedding block. Without positional encoding, a transformer cannot distinguish 'dog bites man' from 'man bites dog'.";
  commonMistakes = [
    "Forgetting to include PositionalEncoding in a transformer architecture — without it, the model treats token order as irrelevant.",
    "Setting d_model to a value that doesn't match the embedding_dim from the Embedding block above it — these must be identical.",
    "Setting max_len smaller than the actual sequence lengths in your dataset — this causes an index out-of-bounds error at runtime.",
  ];
  pytorchClass = "# Custom sinusoidal encoding (no direct nn.X equivalent)";
}
