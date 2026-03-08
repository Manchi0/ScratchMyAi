import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';

export class FlattenBlock extends BlockDefinition {
  type = 'flatten';
  category = 'layer' as const;
  title = 'Flatten';
  
  params: Record<string, BlockParameter> = {
    start_dim: { type: 'int', default: 1, label: 'Start Dim' },
    end_dim: { type: 'int', default: -1, label: 'End Dim' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
