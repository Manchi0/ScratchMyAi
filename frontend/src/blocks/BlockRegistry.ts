import { BlockDefinition } from '@/blocks/BlockDefinition';
import { LinearBlock } from '@/blocks/layers/LinearBlock';
import { ReluBlock } from '@/blocks/activations/ReluBlock';

export const BlockRegistry: Record<string, BlockDefinition> = {
  linear: new LinearBlock(),
  relu: new ReluBlock(),
};

export const getBlockDefinition = (type: string): BlockDefinition | undefined => {
  return BlockRegistry[type];
};
