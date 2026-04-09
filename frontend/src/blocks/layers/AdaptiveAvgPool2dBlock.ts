import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Minimize2 } from 'lucide-react';

export class AdaptiveAvgPool2dBlock extends BlockDefinition {
  type = 'adaptiveavgpool2d';
  category = 'layer' as const;
  title = 'AdaptiveAvgPool2d';
  icon = Minimize2;
  params: Record<string, BlockParameter> = {
    output_size: { type: 'int', default: 1, min: 1, label: 'Output Size' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Like AvgPool2d but automatically adapts the kernel and stride so the output is always the exact target spatial size, regardless of the input dimensions. No need to manually calculate the kernel size.";
  whenToUse = "Use at the end of a convolutional feature extractor when you need a fixed-size output before the fully connected layers. Setting output_size=1 applies global average pooling — it collapses each channel down to a single number, which is a common and effective technique in modern CNNs like ResNet and MobileNet.";
  commonMistakes = [
    "Not realising that output_size=1 (global average pooling) discards all spatial location information — every spatial position is averaged together.",
    "After AdaptiveAvgPool2d with output_size=1, the Flatten output has exactly out_channels features, not out_channels × H × W.",
  ];
  pytorchClass = "nn.AdaptiveAvgPool2d";
}
