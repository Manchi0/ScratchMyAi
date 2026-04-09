import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Maximize2 } from 'lucide-react';

export class ConvTranspose2dBlock extends BlockDefinition {
  type = 'convtranspose2d';
  category = 'layer' as const;
  title = 'ConvTranspose2d';
  icon = Maximize2;
  params: Record<string, BlockParameter> = {
    in_channels: { type: 'int', default: 64, min: 1, label: 'In Channels' },
    out_channels: { type: 'int', default: 64, min: 1, label: 'Out Channels' },
    kernel_size: { type: 'int', default: 3, min: 1, label: 'Kernel Size' },
    stride: { type: 'int', default: 2, min: 1, label: 'Stride' },
    padding: { type: 'int', default: 1, min: 0, label: 'Padding' },
    bias: { type: 'boolean', default: true, label: 'Bias' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "The learnable inverse of Conv2d — it upsamples a feature map by inserting learned values between input positions and then convolving. Often called a deconvolution or transposed convolution. Commonly used in decoders and generators.";
  whenToUse = "Use ConvTranspose2d in decoder networks, variational autoencoders (VAEs), and GANs where you need to increase spatial resolution with learned upsampling. In encoder-decoder architectures, the decoder mirrors the encoder: where the encoder has Conv2d + AvgPool2d, the decoder typically has ConvTranspose2d.";
  commonMistakes = [
    "Confusing in_channels and out_channels direction — in a decoder you go from more channels (smaller spatial size) to fewer channels (larger spatial size).",
    "Getting checkerboard artifacts in outputs — this often happens when stride=2 and kernel_size is not a multiple of stride. Try kernel_size=4 with stride=2 as a clean combination.",
    "Expecting the output size to be exactly 2× the input with stride=2 — verify the output dimensions with the formula: out = (in - 1) × stride - 2 × padding + kernel_size.",
  ];
  pytorchClass = "nn.ConvTranspose2d";
}
