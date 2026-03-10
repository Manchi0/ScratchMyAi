import { BlockDefinition } from '@/blocks/BlockDefinition';
import { LinearBlock } from '@/blocks/layers/LinearBlock';
import { FlattenBlock } from '@/blocks/layers/FlattenBlock';
import { ReluBlock } from '@/blocks/activations/ReluBlock';
import { SoftmaxBlock } from '@/blocks/activations/SoftmaxBlock';
import { DatasetBlock } from '@/blocks/inputs/DatasetBlock';
import { OutputBlock } from '@/blocks/outputs/OutputBlock';

export const BlockRegistry: Record<string, BlockDefinition> = {
  dataset: new DatasetBlock(),
  linear: new LinearBlock(),
  flatten: new FlattenBlock(),
  relu: new ReluBlock(),
  softmax: new SoftmaxBlock(),
  output: new OutputBlock(),
};

export const getBlockDefinition = (type: string): BlockDefinition | undefined => {
  return BlockRegistry[type];
};
