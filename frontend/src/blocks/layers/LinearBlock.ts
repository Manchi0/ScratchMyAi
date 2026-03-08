import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';

export class LinearBlock extends BlockDefinition {
  type = 'linear';
  category = 'layer' as const;
  title = 'Linear';
  params: Record<string, BlockParameter> = { 
    in_features: { type: 'int', default: 64, min: 1 }, 
    out_features: { type: 'int', default: 64, min: 1 }, 
    bias: { type: 'boolean', default: true }
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
