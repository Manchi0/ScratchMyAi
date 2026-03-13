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
}
