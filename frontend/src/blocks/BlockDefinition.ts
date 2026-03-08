import { type Node } from '@xyflow/react';

export type PortType = 'tensor' | 'scalar' | 'dataset';

export interface BlockPort {
  id: string;
  label: string;
  type: PortType;
}

import { BlockParameter } from './BlockParameter';

export abstract class BlockDefinition {
  abstract type: string;
  abstract category: 'input' | 'output' | 'layer' | 'activation';
  abstract title: string;
  
  // Strongly-typed parameter configuration
  abstract params: Record<string, BlockParameter>;
  
  // Connections
  abstract inputs: BlockPort[];
  abstract outputs: BlockPort[];

  // Color mapping based on category
  private static categoryColors: Record<BlockDefinition['category'], string> = {
    input: '#8b5cf6', // Violet
    output: '#ec4899', // Pink
    layer: '#3b82f6', // Blue
    activation: '#22c55e', // Green
  };

  // Derive color automatically from category
  get color(): string {
    return BlockDefinition.categoryColors[this.category];
  }
  
  // Generate a new React Flow Node instance
  createNode(position: { x: number; y: number }): Node {
    // Extract default values for the node's initial state
    const initialParams = Object.entries(this.params).reduce((acc, [key, paramDef]) => {
      acc[key] = paramDef.default;
      return acc;
    }, {} as Record<string, any>);

    return {
      id: `${this.type}-${Date.now()}`,
      type: 'neuralBlock', 
      position,
      data: {
        blockType: this.type,
        params: initialParams
      }
    };
  }
}
