import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Cpu } from 'lucide-react';

export class OutputBlock extends BlockDefinition {
  type = 'output';
  category = 'output' as const;
  title = 'Model';
  icon = Cpu;
  
  params: Record<string, BlockParameter> = {
    name: { type: 'string', default: 'untitled', label: 'Name' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [];
}
