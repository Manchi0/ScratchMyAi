import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Waves } from 'lucide-react';

export class GeluBlock extends BlockDefinition {
  type = 'gelu';
  category = 'activation' as const;
  title = 'GELU';
  icon = Waves;
  params: Record<string, BlockParameter> = {};
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];

  description = "Gaussian Error Linear Unit — a smooth activation that multiplies the input by the probability that the input is positive under a Gaussian distribution. It is differentiable everywhere, unlike ReLU's hard zero at x=0.";
  whenToUse = "Use GELU in transformer and BERT-style models where it is the de-facto standard activation, replacing ReLU in the feed-forward sub-layers. It slightly outperforms ReLU in many language and vision-transformer tasks. For simple CNNs and MLPs, ReLU is still common and computationally cheaper.";
  commonMistakes = [
    "Using GELU in early layers of simple MLPs where ReLU performs just as well at lower computational cost.",
    "Forgetting that GELU, like ReLU, should never be the final output activation for a classification task.",
  ];
  pytorchClass = "nn.GELU";
}
