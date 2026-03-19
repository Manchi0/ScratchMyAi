import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { MapPin } from 'lucide-react';

export class PositionalEncodingBlock extends BlockDefinition {
  type = 'positionalencoding';
  category = 'layer' as const;
  title = 'Positional Encoding';
  icon = MapPin;
  params: Record<string, BlockParameter> = {
    d_model: { type: 'int', default: 64, min: 1, label: 'D Model' },
    max_len: { type: 'int', default: 512, min: 1, label: 'Max Length' },
    dropout: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Dropout' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
