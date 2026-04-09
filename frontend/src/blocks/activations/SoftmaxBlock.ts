import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { BarChart3 } from 'lucide-react';

export class SoftmaxBlock extends BlockDefinition {
  type = 'softmax';
  category = 'activation' as const;
  title = 'Softmax';
  icon = BarChart3;
  
  params: Record<string, BlockParameter> = {
    dim: { type: 'int', default: 1, label: 'Dimension' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Converts a vector of arbitrary numbers (logits) into a probability distribution — all outputs are in [0,1] and sum to exactly 1. Each value represents the model's predicted probability for that class.";
  whenToUse = "Use as the final activation in multi-class classification models, connected after the last Linear layer. Set dim=1 for batched inputs [batch, classes]. Do not use Softmax in the middle of a network or on regression outputs.";
  commonMistakes = [
    "Using Softmax together with CrossEntropyLoss — PyTorch's CrossEntropyLoss applies log-softmax internally, so combining them causes numerical instability and incorrect gradients. Either use Softmax + NLLLoss, or raw logits + CrossEntropyLoss.",
    "Setting dim incorrectly — for a [batch, num_classes] tensor, always use dim=1 to apply softmax over the class dimension.",
    "Using Softmax in hidden layers instead of ReLU/GELU — it creates competition between all hidden neurons and hurts learning.",
  ];
  pytorchClass = "nn.Softmax";
}
