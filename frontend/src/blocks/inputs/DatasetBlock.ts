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

  description = "The Dataset block is your model's entry point — it loads and streams training data in mini-batches. Select a built-in dataset like MNIST or supply your own CSV file.";
  whenToUse = "Place this as the very first block in every graph. It must connect directly to the first processing layer. Use MNIST for handwritten digit classification, FashionMNIST for clothing images, CIFAR-10 for 32×32 color photos, or upload a custom CSV for your own tabular data. Batch size controls how many samples the model sees per gradient update — larger batches train faster but consume more memory.";
  commonMistakes = [
    "Forgetting to draw a connection from the Dataset block — it must have an outgoing edge to the rest of the graph or training will fail.",
    "Using batch_size=1 which makes training extremely slow because gradient updates are very noisy.",
    "Leaving shuffle=false for training data, which can cause the model to memorize the ordering of examples instead of the actual patterns.",
  ];
  pytorchClass = "torch.utils.data.DataLoader";
}
