import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Network } from 'lucide-react';

export class LinearBlock extends BlockDefinition {
  type = 'linear';
  category = 'layer' as const;
  title = 'Linear';
  icon = Network;
  params: Record<string, BlockParameter> = { 
    in_features: { type: 'int', default: 64, min: 1 }, 
    out_features: { type: 'int', default: 64, min: 1 }, 
    bias: { type: 'boolean', default: true }
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "A fully connected layer where every input neuron is connected to every output neuron. It learns a weight matrix W and optional bias b, computing output = x · Wᵀ + b.";
  whenToUse = "Use Linear layers as the 'decision making' part of your model. They typically follow a Flatten block when processing image features, or at the end of a network to map from a hidden representation to class probabilities. Stack multiple Linear layers with activations (like ReLU) between them to build a multilayer perceptron (MLP).";
  commonMistakes = [
    "Setting in_features to the wrong size — it must exactly match the number of features coming from the previous layer (e.g., after Flatten, it is channels × height × width).",
    "Stacking two Linear layers back-to-back without any activation function between them — this is mathematically equivalent to a single linear layer and wastes capacity.",
    "Forgetting to Flatten spatial features before a Linear layer when the input comes from a Conv2d block.",
  ];
  pytorchClass = "nn.Linear";
}
