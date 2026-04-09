import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { ZoomIn } from 'lucide-react';

export class UpsampleBlock extends BlockDefinition {
  type = 'upsample';
  category = 'layer' as const;
  title = 'Upsample';
  icon = ZoomIn;
  params: Record<string, BlockParameter> = {
    scale_factor: { type: 'float', default: 2.0, min: 0.1, label: 'Scale Factor' },
    mode: {
      type: 'select',
      default: 'nearest',
      label: 'Mode',
      options: [
        { label: 'Nearest', value: 'nearest' },
        { label: 'Bilinear', value: 'bilinear' },
        { label: 'Bicubic', value: 'bicubic' },
      ],
    },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Increases the spatial size of a tensor using a fixed interpolation algorithm — nearest neighbor, bilinear, or bicubic. Unlike ConvTranspose2d, Upsample has no learnable parameters; it uses a deterministic formula.";
  whenToUse = "Use Upsample as a simpler, parameter-free alternative to ConvTranspose2d in decoder networks. Often paired with a regular Conv2d immediately after it (the 'sub-pixel convolution' pattern), which applies learned processing to the upsampled features. Bilinear produces smoother results; nearest is faster and avoids interpolation artifacts.";
  commonMistakes = [
    "Forgetting that Upsample has no learnable weights — it cannot learn how to best upsample; if you need the model to learn upsampling behaviour, use ConvTranspose2d instead.",
    "Using bilinear mode on non-image or non-2D tensors — bilinear interpolation only works on 4D tensors (batch × channels × H × W).",
  ];
  pytorchClass = "nn.Upsample";
}
