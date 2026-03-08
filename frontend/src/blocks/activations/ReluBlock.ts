import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Activity } from 'lucide-react';

export class ReluBlock extends BlockDefinition {
  type = 'relu';
  category = 'activation' as const;
  title = 'ReLU';
  icon = Activity;
  params: Record<string, BlockParameter> = {};
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
