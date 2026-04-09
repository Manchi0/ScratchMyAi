import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { AlignCenter } from 'lucide-react';

export class LayerNormBlock extends BlockDefinition {
  type = 'layernorm';
  category = 'layer' as const;
  title = 'LayerNorm';
  icon = AlignCenter;
  params: Record<string, BlockParameter> = {
    normalized_shape: { type: 'int', default: 64, min: 1, label: 'Normalized Shape' },
    eps: { type: 'float', default: 1e-5, min: 0, label: 'Epsilon' },
    elementwise_affine: { type: 'boolean', default: true, label: 'Elementwise Affine' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Normalizes activations across the feature dimension for each individual sample, rather than across the batch. Unlike BatchNorm1d, it works correctly even with batch_size=1.";
  whenToUse = "Use LayerNorm in transformer and attention-based architectures — it is the standard normalization in transformers because it is stable at any batch size and handles variable-length sequences well. It should appear after every attention block and feed-forward sub-layer in a transformer.";
  commonMistakes = [
    "Confusing LayerNorm with BatchNorm1d — LayerNorm normalizes per-sample over features; BatchNorm normalizes per-feature over the batch. LayerNorm is for transformers, BatchNorm is for CNNs/MLPs with large batches.",
    "Setting normalized_shape to a value that doesn't match the last dimension of your input tensor.",
  ];
  pytorchClass = "nn.LayerNorm";
}
