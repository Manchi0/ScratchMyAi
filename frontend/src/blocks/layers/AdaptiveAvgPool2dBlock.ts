import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Minimize2 } from 'lucide-react';

export class AdaptiveAvgPool2dBlock extends BlockDefinition {
  type = 'adaptiveavgpool2d';
  category = 'layer' as const;
  title = 'AdaptiveAvgPool2d';
  icon = Minimize2;
  params: Record<string, BlockParameter> = {
    output_size: { type: 'int', default: 1, min: 1, label: 'Output Size' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
