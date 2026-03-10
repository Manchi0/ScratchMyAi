import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { BarChart3 } from 'lucide-react';

export class SoftmaxBlock extends BlockDefinition {
  type = 'softmax';
  category = 'activation' as const;
  title = 'Softmax';
  icon = BarChart3;
  
  params: Record<string, BlockParameter> = {
    dim: { type: 'int', default: 1, label: 'Dimension' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
