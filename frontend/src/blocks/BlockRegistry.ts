import { BlockDefinition } from '@/blocks/BlockDefinition';
import { Conv2dBlock } from '@/blocks/layers/Conv2dBlock';
import { LinearBlock } from '@/blocks/layers/LinearBlock';
import { FlattenBlock } from '@/blocks/layers/FlattenBlock';
import { BatchNorm1dBlock } from '@/blocks/layers/BatchNorm1dBlock';
import { AvgPool2dBlock } from '@/blocks/layers/AvgPool2dBlock';
import { AdaptiveAvgPool2dBlock } from '@/blocks/layers/AdaptiveAvgPool2dBlock';
import { ConvTranspose2dBlock } from '@/blocks/layers/ConvTranspose2dBlock';
import { UpsampleBlock } from '@/blocks/layers/UpsampleBlock';
import { LayerNormBlock } from '@/blocks/layers/LayerNormBlock';
import { EmbeddingBlock } from '@/blocks/layers/EmbeddingBlock';
import { LSTMBlock } from '@/blocks/layers/LSTMBlock';
import { GRUBlock } from '@/blocks/layers/GRUBlock';
import { RnnBlock } from '@/blocks/layers/RnnBlock';
import { PositionalEncodingBlock } from '@/blocks/layers/PositionalEncodingBlock';
import { SelfAttentionBlock } from '@/blocks/layers/SelfAttentionBlock';
import { TransformerEncoderLayerBlock } from '@/blocks/layers/TransformerEncoderLayerBlock';
import { ReluBlock } from '@/blocks/activations/ReluBlock';
import { SoftmaxBlock } from '@/blocks/activations/SoftmaxBlock';
import { GeluBlock } from '@/blocks/activations/GeluBlock';
import { DatasetBlock } from '@/blocks/inputs/DatasetBlock';
import { OutputBlock } from '@/blocks/outputs/OutputBlock';

export const BlockRegistry: Record<string, BlockDefinition> = {
  dataset: new DatasetBlock(),
  conv2d: new Conv2dBlock(),
  linear: new LinearBlock(),
  flatten: new FlattenBlock(),
  batchnorm1d: new BatchNorm1dBlock(),
  avgpool2d: new AvgPool2dBlock(),
  adaptiveavgpool2d: new AdaptiveAvgPool2dBlock(),
  convtranspose2d: new ConvTranspose2dBlock(),
  upsample: new UpsampleBlock(),
  layernorm: new LayerNormBlock(),
  embedding: new EmbeddingBlock(),
  rnn: new RnnBlock(),
  lstm: new LSTMBlock(),
  gru: new GRUBlock(),
  positionalencoding: new PositionalEncodingBlock(),
  selfattention: new SelfAttentionBlock(),
  transformerencoderlayer: new TransformerEncoderLayerBlock(),
  relu: new ReluBlock(),
  gelu: new GeluBlock(),
  softmax: new SoftmaxBlock(),
  output: new OutputBlock(),
};

export const getBlockDefinition = (type: string): BlockDefinition | undefined => {
  return BlockRegistry[type];
};
