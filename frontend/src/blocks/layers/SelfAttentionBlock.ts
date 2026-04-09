import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Focus } from 'lucide-react';

export class SelfAttentionBlock extends BlockDefinition {
  type = 'selfattention';
  category = 'layer' as const;
  title = 'Self-Attention';
  icon = Focus;
  params: Record<string, BlockParameter> = {
    embed_dim: { type: 'int', default: 64, min: 1, label: 'Embed Dim' },
    num_heads: { type: 'int', default: 4, min: 1, label: 'Num Heads' },
    dropout: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Dropout' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Multi-head self-attention allows every position in a sequence to 'look at' all other positions simultaneously and learn which ones are most relevant. Multiple attention heads learn different relationship patterns in parallel.";
  whenToUse = "Use as a building block within transformer architectures, placed after PositionalEncoding. num_heads must evenly divide embed_dim (e.g., embed_dim=64 with num_heads=4 or 8). In full transformers this is typically followed by LayerNorm and a feed-forward block with a residual connection.";
  commonMistakes = [
    "Setting num_heads to a value that does not divide embed_dim evenly — this causes a runtime error (e.g., embed_dim=64, num_heads=3 is invalid).",
    "Forgetting to add LayerNorm and a residual connection after the attention block — the standard transformer uses Add & Norm after every sub-layer.",
    "Using SelfAttention without positional encoding — attention is permutation-invariant, so the model cannot distinguish token positions.",
  ];
  pytorchClass = "nn.MultiheadAttention";
}
