import { create } from "zustand";
import { 
  type Node, 
  type Edge, 
  type OnNodesChange, 
  type OnEdgesChange, 
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import { getBlockDefinition } from "@/blocks/BlockRegistry";

interface AppState {
  // Workflow identity
  workflowId: string | null;
  setWorkflowId: (id: string | null) => void;

  // Workflow Title
  title: string;
  setTitle: (title: string) => void;

  // React Flow State
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, newData: Record<string, any>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  workflowId: null,
  setWorkflowId: (id) => set({ workflowId: id }),

  title: "Untitled",
  setTitle: (title) => set({ title }),

  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set((state) => {
      // Find the source node to steal its category color
      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      let edgeColor = '#8b5cf6'; // default
      
      if (sourceNode && sourceNode.data.blockType) {
        const def = getBlockDefinition(sourceNode.data.blockType as string);
        if (def) edgeColor = def.color;
      }

      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        type: 'wire',
        data: { color: edgeColor }
      } as Edge;

      return {
        edges: addEdge(newEdge, state.edges),
      };
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      }),
    });
  },
}));
