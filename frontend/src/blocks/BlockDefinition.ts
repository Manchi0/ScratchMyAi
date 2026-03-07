import { type Node } from '@xyflow/react';

export type PortType = 'tensor' | 'scalar' | 'dataset';

export interface BlockPort {
  id: string;
  label: string;
  type: PortType;
}

export abstract class BlockDefinition {
  abstract type: string;
  abstract category: 'input' | 'output' | 'layer' | 'activation';
  abstract title: string;
  
  // Default user-configurable parameters
  abstract defaultParams: Record<string, any>;
  
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
    return {
      id: `${this.type}-${Date.now()}`,
      type: 'neuralBlock', 
      position,
      data: {
        blockType: this.type,
        params: { ...this.defaultParams }
      }
    };
  }
}
