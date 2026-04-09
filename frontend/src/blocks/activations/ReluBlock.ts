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

  description = "Rectified Linear Unit — outputs zero for negative inputs and passes positive inputs through unchanged: f(x) = max(0, x). The most widely used activation function in modern neural networks.";
  whenToUse = "Use ReLU after every hidden Linear or Conv2d layer in a standard feedforward or convolutional network. It introduces non-linearity, which is what allows a network to learn complex, non-linear patterns. Do not use ReLU as the final output activation — use Softmax for classification or nothing (raw logits) for regression.";
  commonMistakes = [
    "Using ReLU as the final output activation for a classification task — use Softmax (or let CrossEntropyLoss handle it internally with raw logits).",
    "Stacking ReLU layers directly without any Linear or Conv layer between them — this is redundant since ReLU(ReLU(x)) = ReLU(x).",
    "Dead ReLU neurons: if your learning rate is too high, many neurons can get stuck always outputting 0 and never recovering. Lower the learning rate or use a small weight initialization.",
  ];
  pytorchClass = "nn.ReLU";
}
