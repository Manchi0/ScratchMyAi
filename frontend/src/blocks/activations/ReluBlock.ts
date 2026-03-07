import { BlockDefinition, BlockPort, PortType } from '../BlockDefinition';

export class ReluBlock extends BlockDefinition {
  type = 'relu';
  category = 'activation' as const;
  title = 'ReLU';
  defaultParams = {};
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
