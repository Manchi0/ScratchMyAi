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

  description = "The terminal block that marks the end of your model. It receives the final tensor from your last layer and defines the model's output. Every graph must end with exactly one Output block.";
  whenToUse = "Always connect your last activation (typically Softmax for classification) to this block. The name parameter is used to identify your saved model in the dashboard. If the Output block is not connected, training will fail because the system cannot determine what to optimize.";
  commonMistakes = [
    "Not connecting the Output block — training will fail if the output has no incoming connection.",
    "Having more than one Output block in a graph — use exactly one.",
    "Connecting a raw Linear layer directly without a final activation when the task is classification — the probabilities won't sum to 1.",
  ];
  pytorchClass = "# No PyTorch equivalent — represents the model's output interface";
}
