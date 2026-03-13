import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { GitBranch } from 'lucide-react';

export class LSTMBlock extends BlockDefinition {
  type = 'lstm';
  category = 'layer' as const;
  title = 'LSTM';
  icon = GitBranch;
  params: Record<string, BlockParameter> = {
    input_size: { type: 'int', default: 64, min: 1, label: 'Input Size' },
    hidden_size: { type: 'int', default: 128, min: 1, label: 'Hidden Size' },
    num_layers: { type: 'int', default: 1, min: 1, label: 'Num Layers' },
    bidirectional: { type: 'boolean', default: false, label: 'Bidirectional' },
    return_sequence: { type: 'boolean', default: false, label: 'Return Sequence' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
