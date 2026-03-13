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
}
