import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Minimize2 } from 'lucide-react';

export class FlattenBlock extends BlockDefinition {
  type = 'flatten';
  category = 'layer' as const;
  title = 'Flatten';
  icon = Minimize2;
  
  params: Record<string, BlockParameter> = {
    start_dim: { type: 'int', default: 1, label: 'Start Dim' },
    end_dim: { type: 'int', default: -1, label: 'End Dim' }
  };
  
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Collapses all dimensions of a tensor except the batch dimension into a single vector. Converts a multi-dimensional feature map (e.g., [B, C, H, W]) into a flat 2D tensor (e.g., [B, C×H×W]).";
  whenToUse = "Place Flatten between convolutional layers and fully-connected Linear layers. After several Conv2d and pooling operations you have a 4D spatial feature map — Flatten converts it into a 2D matrix so Linear layers can process it. Leave start_dim=1 to preserve the batch dimension.";
  commonMistakes = [
    "Forgetting to place Flatten before the first Linear layer after a Conv block — Linear expects 2D input [B, features], not 4D.",
    "Setting start_dim=0 which would also flatten the batch dimension, merging all examples together incorrectly.",
  ];
  pytorchClass = "nn.Flatten";
}
