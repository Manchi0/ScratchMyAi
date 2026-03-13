import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { ZoomIn } from 'lucide-react';

export class UpsampleBlock extends BlockDefinition {
  type = 'upsample';
  category = 'layer' as const;
  title = 'Upsample';
  icon = ZoomIn;
  params: Record<string, BlockParameter> = {
    scale_factor: { type: 'float', default: 2.0, min: 0.1, label: 'Scale Factor' },
    mode: {
      type: 'select',
      default: 'nearest',
      label: 'Mode',
      options: [
        { label: 'Nearest', value: 'nearest' },
        { label: 'Bilinear', value: 'bilinear' },
        { label: 'Bicubic', value: 'bicubic' },
      ],
    },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
