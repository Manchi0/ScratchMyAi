import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Layers } from 'lucide-react';

export class TransformerEncoderLayerBlock extends BlockDefinition {
  type = 'transformerencoderlayer';
  category = 'layer' as const;
  title = 'Transformer Encoder Layer';
  icon = Layers;
  params: Record<string, BlockParameter> = {
    d_model: { type: 'int', default: 64, min: 1, label: 'D Model' },
    nhead: { type: 'int', default: 4, min: 1, label: 'Num Heads' },
    dim_feedforward: { type: 'int', default: 256, min: 1, label: 'FFN Dim' },
    dropout: { type: 'float', default: 0.1, min: 0.0, max: 1.0, label: 'Dropout' },
    activation: { type: 'select', default: 'relu', options: [{ label: 'ReLU', value: 'relu' }, { label: 'GELU', value: 'gelu' }], label: 'Activation' },
    batch_first: { type: 'boolean', default: true, label: 'Batch First' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "A complete transformer encoder block — multi-head self-attention, a position-wise feed-forward network, layer normalization, and residual connections all pre-assembled. The standard building block for BERT-style encoder models.";
  whenToUse = "Use this as a complete, ready-to-use transformer encoder block. Stack multiple TransformerEncoderLayer blocks for deeper models. The d_model must match the feature dimension of the sequence coming from PositionalEncoding. Keep batch_first=True for the standard (batch, sequence, features) tensor layout. dim_feedforward is typically 4 × d_model.";
  commonMistakes = [
    "Setting nhead to a value that does not divide d_model evenly — this is a hard constraint (e.g., d_model=64 works with nhead=4 or 8 but not 5).",
    "Not matching d_model with the embedding dimension from the preceding Embedding and PositionalEncoding blocks.",
    "Forgetting to set batch_first=True — the default in PyTorch is (seq, batch, features) which is counterintuitive.",
  ];
  pytorchClass = "nn.TransformerEncoderLayer";
}
