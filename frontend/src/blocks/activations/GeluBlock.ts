import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Waves } from 'lucide-react';

export class GeluBlock extends BlockDefinition {
  type = 'gelu';
  category = 'activation' as const;
  title = 'GELU';
  icon = Waves;
  params: Record<string, BlockParameter> = {};
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
