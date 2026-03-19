import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Layers } from 'lucide-react';

export class TransformerEncoderLayerBlock extends BlockDefinition {
  type = 'transformerencoderlayer';
  category = 'layer' as const;
  title = 'Transformer Encoder Layer';
  icon = Layers;
  params: Record<string, BlockParameter> = {
    d_model: { type: 'int', default: 64, min: 1, label: 'D Model' },
    nhead: { type: 'int', default: 4, min: 1, label: 'Num Heads' },
    dim_feedforward: { type: 'int', default: 256, min: 1, label: 'FFN Dim' },
    dropout: { type: 'float', default: 0.1, min: 0.0, max: 1.0, label: 'Dropout' },
    activation: { type: 'select', default: 'relu', options: [{ label: 'ReLU', value: 'relu' }, { label: 'GELU', value: 'gelu' }], label: 'Activation' },
    batch_first: { type: 'boolean', default: true, label: 'Batch First' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
