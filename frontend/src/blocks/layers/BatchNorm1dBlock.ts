import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Sliders } from 'lucide-react';

export class BatchNorm1dBlock extends BlockDefinition {
  type = 'batchnorm1d';
  category = 'layer' as const;
  title = 'BatchNorm1d';
  icon = Sliders;
  params: Record<string, BlockParameter> = {
    num_features: { type: 'int', default: 64, min: 1, label: 'Num Features' },
    eps: { type: 'float', default: 1e-5, min: 0, label: 'Epsilon' },
    momentum: { type: 'float', default: 0.1, min: 0, max: 1, label: 'Momentum' },
    affine: { type: 'boolean', default: true, label: 'Affine' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Normalizes the activations from the previous layer across each mini-batch, keeping the mean near 0 and standard deviation near 1. It then applies learnable scale (gamma) and shift (beta) parameters.";
  whenToUse = "Insert BatchNorm1d after Linear layers to stabilize training. The conventional order is Linear → BatchNorm → ReLU. It allows you to use higher learning rates, reduces sensitivity to weight initialization, and acts as a mild regularizer. Not ideal for very small batch sizes (below 8) since batch statistics become unreliable.";
  commonMistakes = [
    "Using BatchNorm1d with batch_size=1 — normalization is undefined for a single sample; use LayerNorm instead.",
    "Placing it after the activation function instead of before it — the standard convention is Linear → BN → ReLU.",
    "Setting num_features incorrectly — it must match the out_features of the preceding Linear layer.",
  ];
  pytorchClass = "nn.BatchNorm1d";
}
