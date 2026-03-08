import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';

export class ReluBlock extends BlockDefinition {
  type = 'relu';
  category = 'activation' as const;
  title = 'ReLU';
  params: Record<string, BlockParameter> = {};
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
