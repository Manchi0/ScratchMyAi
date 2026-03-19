import { BlockDefinition, BlockPort } from '../BlockDefinition';
import { BlockParameter } from '../BlockParameter';
import { Database } from 'lucide-react';

export class DatasetBlock extends BlockDefinition {
  type = 'dataset';
  category = 'input' as const;
  title = 'Dataset';
  icon = Database;
  params: Record<string, BlockParameter> = {
    dataset_source: {
      type: 'select',
      default: 'mnist',
      label: 'Source',
      options: [
        { label: 'MNIST', value: 'mnist' },
        { label: 'FashionMNIST', value: 'fashionmnist' },
        { label: 'CIFAR-10', value: 'cifar10' },
        { label: 'Custom File', value: 'custom' }
      ]
    },
    batch_size: { type: 'int', default: 32, min: 1, label: 'Batch Size' },
    shuffle: { type: 'boolean', default: true, label: 'Shuffle' },
    file: { type: 'file', default: null, accept: '.csv,.zip', label: 'Upload' }
  };
  inputs: BlockPort[] = [];
  outputs: BlockPort[] = [{ id: 'out', label: 'Data', type: 'dataset' }];
}
