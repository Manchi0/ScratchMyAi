function b(val: boolean): string {
  return val ? 'True' : 'False';
}

export function getPytorchSnippet(blockType: string, params: Record<string, any>): string {
  const p = (key: string) => params[key];

  switch (blockType) {
    case 'linear':
      return `nn.Linear(in_features=${p('in_features')}, out_features=${p('out_features')}, bias=${b(p('bias'))})`;
    case 'conv2d':
      return `nn.Conv2d(\n  in_channels=${p('in_channels')}, out_channels=${p('out_channels')},\n  kernel_size=${p('kernel_size')}, stride=${p('stride')}, padding=${p('padding')},\n  bias=${b(p('bias'))}\n)`;
    case 'flatten':
      return `nn.Flatten(start_dim=${p('start_dim')}, end_dim=${p('end_dim')})`;
    case 'batchnorm1d':
      return `nn.BatchNorm1d(\n  num_features=${p('num_features')}, eps=${p('eps')},\n  momentum=${p('momentum')}, affine=${b(p('affine'))}\n)`;
    case 'avgpool2d':
      return `nn.AvgPool2d(kernel_size=${p('kernel_size')}, stride=${p('stride')}, padding=${p('padding')})`;
    case 'adaptiveavgpool2d':
      return `nn.AdaptiveAvgPool2d(output_size=${p('output_size')})`;
    case 'convtranspose2d':
      return `nn.ConvTranspose2d(\n  in_channels=${p('in_channels')}, out_channels=${p('out_channels')},\n  kernel_size=${p('kernel_size')}, stride=${p('stride')}, padding=${p('padding')},\n  bias=${b(p('bias'))}\n)`;
    case 'upsample':
      return `nn.Upsample(scale_factor=${p('scale_factor')}, mode='${p('mode')}')`;
    case 'layernorm':
      return `nn.LayerNorm(\n  normalized_shape=${p('normalized_shape')}, eps=${p('eps')},\n  elementwise_affine=${b(p('elementwise_affine'))}\n)`;
    case 'embedding':
      return `nn.Embedding(\n  num_embeddings=${p('num_embeddings')}, embedding_dim=${p('embedding_dim')},\n  padding_idx=${p('padding_idx')}\n)`;
    case 'rnn':
      return `nn.RNN(\n  input_size=${p('input_size')}, hidden_size=${p('hidden_size')},\n  num_layers=${p('num_layers')}, batch_first=${b(p('batch_first'))},\n  nonlinearity='${p('nonlinearity')}'\n)`;
    case 'lstm':
      return `nn.LSTM(\n  input_size=${p('input_size')}, hidden_size=${p('hidden_size')},\n  num_layers=${p('num_layers')}, bidirectional=${b(p('bidirectional'))}\n)`;
    case 'gru':
      return `nn.GRU(\n  input_size=${p('input_size')}, hidden_size=${p('hidden_size')},\n  num_layers=${p('num_layers')}, bidirectional=${b(p('bidirectional'))}\n)`;
    case 'positionalencoding':
      return `# Custom PositionalEncoding(\n#   d_model=${p('d_model')}, max_len=${p('max_len')},\n#   dropout=${p('dropout')}\n# )`;
    case 'selfattention':
      return `nn.MultiheadAttention(\n  embed_dim=${p('embed_dim')}, num_heads=${p('num_heads')},\n  dropout=${p('dropout')}, batch_first=True\n)`;
    case 'transformerencoderlayer':
      return `nn.TransformerEncoderLayer(\n  d_model=${p('d_model')}, nhead=${p('nhead')},\n  dim_feedforward=${p('dim_feedforward')}, dropout=${p('dropout')},\n  activation='${p('activation')}', batch_first=${b(p('batch_first'))}\n)`;
    case 'relu':
      return `nn.ReLU()`;
    case 'gelu':
      return `nn.GELU()`;
    case 'softmax':
      return `nn.Softmax(dim=${p('dim')})`;
    case 'dataset':
      return `# DataLoader(\n#   dataset, batch_size=${p('batch_size')},\n#   shuffle=${b(p('shuffle'))}\n# )`;
    case 'output':
      return `# Output block — marks the model's output interface\n# No direct nn.X equivalent`;
    default:
      return `# Unknown block: ${blockType}`;
  }
}

export function getParamCount(blockType: string, params: Record<string, any>): number {
  const p = (key: string) => Number(params[key] ?? 0);

  switch (blockType) {
    case 'linear': {
      const weights = p('in_features') * p('out_features');
      const bias = params['bias'] ? p('out_features') : 0;
      return weights + bias;
    }
    case 'conv2d': {
      const weights = p('out_channels') * p('in_channels') * p('kernel_size') * p('kernel_size');
      const bias = params['bias'] ? p('out_channels') : 0;
      return weights + bias;
    }
    case 'convtranspose2d': {
      const weights = p('in_channels') * p('out_channels') * p('kernel_size') * p('kernel_size');
      const bias = params['bias'] ? p('out_channels') : 0;
      return weights + bias;
    }
    case 'batchnorm1d':
      return params['affine'] ? p('num_features') * 2 : 0;
    case 'layernorm':
      return params['elementwise_affine'] ? p('normalized_shape') * 2 : 0;
    case 'embedding':
      return p('num_embeddings') * p('embedding_dim');
    case 'rnn': {
      const ih = p('input_size') * p('hidden_size');
      const hh = p('hidden_size') * p('hidden_size');
      const biasParams = p('hidden_size') * 2;
      return (ih + hh + biasParams) * p('num_layers');
    }
    case 'lstm': {
      const ih = p('input_size') * p('hidden_size');
      const hh = p('hidden_size') * p('hidden_size');
      const biasParams = p('hidden_size') * 2;
      const perLayer = (ih + hh + biasParams) * 4;
      const dirs = params['bidirectional'] ? 2 : 1;
      return perLayer * p('num_layers') * dirs;
    }
    case 'gru': {
      const ih = p('input_size') * p('hidden_size');
      const hh = p('hidden_size') * p('hidden_size');
      const biasParams = p('hidden_size') * 2;
      const perLayer = (ih + hh + biasParams) * 3;
      const dirs = params['bidirectional'] ? 2 : 1;
      return perLayer * p('num_layers') * dirs;
    }
    case 'selfattention': {
      const d = p('embed_dim');
      return d * d * 4 + d * 4;
    }
    case 'transformerencoderlayer': {
      const d = p('d_model');
      const ff = p('dim_feedforward');
      const attn = d * d * 4 + d * 4;
      const ffn = d * ff + ff + ff * d + d;
      const norms = d * 4;
      return attn + ffn + norms;
    }
    default:
      return 0;
  }
}

export function formatParamCount(n: number): string {
  if (n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
