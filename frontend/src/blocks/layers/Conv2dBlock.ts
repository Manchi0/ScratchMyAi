import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { ScanSearch } from 'lucide-react';

export class Conv2dBlock extends BlockDefinition {
  type = 'conv2d';
  category = 'layer' as const;
  title = 'Conv2d';
  icon = ScanSearch;
  params: Record<string, BlockParameter> = {
    in_channels: { type: 'int', default: 1, min: 1, label: 'In Channels' },
    out_channels: { type: 'int', default: 32, min: 1, label: 'Out Channels' },
    kernel_size: { type: 'int', default: 3, min: 1, label: 'Kernel Size' },
    stride: { type: 'int', default: 1, min: 1, label: 'Stride' },
    padding: { type: 'int', default: 1, min: 0, label: 'Padding' },
    bias: { type: 'boolean', default: true, label: 'Bias' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "A 2D convolution layer that slides small learnable filters (kernels) across an input image to detect local patterns like edges, textures, and shapes. It shares weights across spatial positions, making it very parameter-efficient.";
  whenToUse = "Use Conv2d as the core building block for image processing. Stack multiple Conv2d layers to learn increasingly abstract features — early layers detect edges, later layers detect shapes and objects. The first Conv2d must have in_channels matching your input (1 for grayscale MNIST, 3 for RGB CIFAR-10). Typically pair each Conv2d with an activation and an optional pooling layer.";
  commonMistakes = [
    "Setting in_channels incorrectly — use 1 for MNIST/grayscale images, 3 for CIFAR-10/RGB images.",
    "Using kernel_size larger than the current feature map size, which causes a runtime error.",
    "Not adding padding when you want to preserve spatial dimensions — use padding=kernel_size//2 to keep the output the same size as the input.",
  ];
  pytorchClass = "nn.Conv2d";
}
