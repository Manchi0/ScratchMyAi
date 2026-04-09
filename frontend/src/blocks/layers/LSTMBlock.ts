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

  description = "Long Short-Term Memory network with gated memory cells that can selectively remember or forget information over long sequences. Much more capable than a plain RNN for tasks requiring long-range dependencies.";
  whenToUse = "Use LSTM for sequence modeling tasks like text classification, time-series forecasting, and language modeling. It excels at tasks where context from 50+ steps ago still matters. Set bidirectional=True when having context from both directions helps (e.g., sentiment classification, named entity recognition — but not text generation).";
  commonMistakes = [
    "Forgetting that LSTM returns a tuple (output, (hidden_state, cell_state)) — the model backend handles unpacking, but it is useful to understand what's happening.",
    "Using bidirectional=True without adjusting the in_features of the next Linear layer — the output has hidden_size × 2 features, not hidden_size.",
    "Setting hidden_size too small for complex sequences — use at least 128 for most language tasks.",
  ];
  pytorchClass = "nn.LSTM";
}
