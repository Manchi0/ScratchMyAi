import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { ScanSearch } from 'lucide-react';

export class Conv2dBlock extends BlockDefinition {
  type = 'conv2d';
  category = 'layer' as const;
  title = 'Conv2d';
  icon = ScanSearch;
  params: Record<string, BlockParameter> = {
    in_channels: { type: 'int', default: 1, min: 1, label: 'In Channels' },
    out_channels: { type: 'int', default: 32, min: 1, label: 'Out Channels' },
    kernel_size: { type: 'int', default: 3, min: 1, label: 'Kernel Size' },
    stride: { type: 'int', default: 1, min: 1, label: 'Stride' },
    padding: { type: 'int', default: 1, min: 0, label: 'Padding' },
    bias: { type: 'boolean', default: true, label: 'Bias' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
