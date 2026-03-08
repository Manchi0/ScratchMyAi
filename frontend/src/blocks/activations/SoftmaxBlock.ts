import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';

export class SoftmaxBlock extends BlockDefinition {
  type = 'softmax';
  category = 'activation' as const;
  title = 'Softmax';
  
  params: Record<string, BlockParameter> = {
    dim: { type: 'int', default: 1, label: 'Dimension' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
