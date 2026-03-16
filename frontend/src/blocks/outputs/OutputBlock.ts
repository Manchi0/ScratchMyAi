import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Flag } from 'lucide-react';

export class OutputBlock extends BlockDefinition {
  type = 'output';
  category = 'output' as const;
  title = 'Output';
  icon = Flag;
  
  params: Record<string, BlockParameter> = {
    name: { type: 'string', default: 'predictions', label: 'Layer Name' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [];
}
