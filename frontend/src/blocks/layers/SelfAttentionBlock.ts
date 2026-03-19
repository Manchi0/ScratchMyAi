import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Focus } from 'lucide-react';

export class SelfAttentionBlock extends BlockDefinition {
  type = 'selfattention';
  category = 'layer' as const;
  title = 'Self-Attention';
  icon = Focus;
  params: Record<string, BlockParameter> = {
    embed_dim: { type: 'int', default: 64, min: 1, label: 'Embed Dim' },
    num_heads: { type: 'int', default: 4, min: 1, label: 'Num Heads' },
    dropout: { type: 'float', default: 0.0, min: 0.0, max: 1.0, label: 'Dropout' },
  };
  inputs: BlockPort[] = [{ id: 'in', label: 'Input', type: 'tensor' }];
  outputs: BlockPort[] = [{ id: 'out', label: 'Output', type: 'tensor' }];
}
