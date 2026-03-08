import { BlockDefinition } from '@/blocks/BlockDefinition';
import { LinearBlock } from '@/blocks/layers/LinearBlock';
import { ReluBlock } from '@/blocks/activations/ReluBlock';
import { DatasetBlock } from '@/blocks/inputs/DatasetBlock';
import { OutputBlock } from '@/blocks/outputs/OutputBlock';

export const BlockRegistry: Record<string, BlockDefinition> = {
  dataset: new DatasetBlock(),
  linear: new LinearBlock(),
  relu: new ReluBlock(),
  output: new OutputBlock(),
};

export const getBlockDefinition = (type: string): BlockDefinition | undefined => {
  return BlockRegistry[type];
};
