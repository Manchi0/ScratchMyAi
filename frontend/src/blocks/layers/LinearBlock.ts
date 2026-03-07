import { BlockDefinition, BlockPort, PortType } from '../BlockDefinition';

export class LinearBlock extends BlockDefinition {
  type = 'linear';
  category = 'layer' as const;
  title = 'Linear';
  defaultParams = { 
    in_features: 64, 
    out_features: 64, 
    bias: true 
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
