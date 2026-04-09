import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Share2 } from 'lucide-react';

export class GRUBlock extends BlockDefinition {
  type = 'gru';
  category = 'layer' as const;
  title = 'GRU';
  icon = Share2;
  params: Record<string, BlockParameter> = {
    input_size: { type: 'int', default: 64, min: 1, label: 'Input Size' },
    hidden_size: { type: 'int', default: 128, min: 1, label: 'Hidden Size' },
    num_layers: { type: 'int', default: 1, min: 1, label: 'Num Layers' },
    bidirectional: { type: 'boolean', default: false, label: 'Bidirectional' },
    return_sequence: { type: 'boolean', default: false, label: 'Return Sequence' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Gated Recurrent Unit — a streamlined recurrent network with two gates (reset and update) instead of LSTM's three. It has fewer parameters than LSTM and often performs comparably on many sequence tasks.";
  whenToUse = "Use GRU when you want LSTM-level performance with faster training and fewer parameters. It is a good first choice for most recurrent tasks before committing to the heavier LSTM. Particularly effective on short-to-medium length sequences. Like LSTM, set bidirectional=True when both past and future context are available.";
  commonMistakes = [
    "GRU only returns (output, hidden_state), not a cell state like LSTM — this makes output handling slightly simpler.",
    "Using bidirectional=True without adjusting downstream layer sizes — the output has hidden_size × 2 features.",
    "Choosing GRU over LSTM just to be different — try both and compare; LSTM sometimes wins on very long sequences.",
  ];
  pytorchClass = "nn.GRU";
}
