import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Grid } from 'lucide-react';

export class AvgPool2dBlock extends BlockDefinition {
  type = 'avgpool2d';
  category = 'layer' as const;
  title = 'AvgPool2d';
  icon = Grid;
  params: Record<string, BlockParameter> = {
    kernel_size: { type: 'int', default: 2, min: 1, label: 'Kernel Size' },
    stride: { type: 'int', default: 2, min: 1, label: 'Stride' },
    padding: { type: 'int', default: 0, min: 0, label: 'Padding' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Reduces the spatial size of a feature map by computing the average value within each non-overlapping window. Downsamples height and width while preserving the number of channels.";
  whenToUse = "Use after Conv2d layers to progressively reduce spatial resolution and the total computation in subsequent layers. It preserves more signal information than MaxPool2d and is effective when you want translation-invariant summaries of features rather than peak responses. The output size is roughly input_size / stride.";
  commonMistakes = [
    "Using a kernel_size larger than the current feature map height or width, which causes a runtime error.",
    "Forgetting that pooling shrinks spatial dimensions, which changes the number of features after a Flatten layer — recalculate in_features for the following Linear block.",
  ];
  pytorchClass = "nn.AvgPool2d";
}
