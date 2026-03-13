import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Grid } from 'lucide-react';

export class AvgPool2dBlock extends BlockDefinition {
  type = 'avgpool2d';
  category = 'layer' as const;
  title = 'AvgPool2d';
  icon = Grid;
  params: Record<string, BlockParameter> = {
    kernel_size: { type: 'int', default: 2, min: 1, label: 'Kernel Size' },
    stride: { type: 'int', default: 2, min: 1, label: 'Stride' },
    padding: { type: 'int', default: 0, min: 0, label: 'Padding' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
