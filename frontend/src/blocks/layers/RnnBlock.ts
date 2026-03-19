import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { RefreshCw } from 'lucide-react';

export class RnnBlock extends BlockDefinition {
  type = 'rnn';
  category = 'layer' as const;
  title = 'RNN';
  icon = RefreshCw;
  params: Record<string, BlockParameter> = {
    input_size: { type: 'int', default: 28, min: 1, label: 'Input Size' },
    hidden_size: { type: 'int', default: 64, min: 1, label: 'Hidden Size' },
    num_layers: { type: 'int', default: 1, min: 1, label: 'Num Layers' },
    batch_first: { type: 'boolean', default: true, label: 'Batch First' },
    nonlinearity: { type: 'select', default: 'tanh', options: [{ label: 'Tanh', value: 'tanh' }, { label: 'ReLU', value: 'relu' }], label: 'Nonlinearity' },
    return_sequence: { type: 'boolean', default: false, label: 'Return Sequence' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
