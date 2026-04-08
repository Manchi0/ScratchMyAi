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
import { validateConnection } from "@/lib/connectionValidator";
import type { CheckResult } from "@/pages/learn/courses/mlpIntro";

export interface TrainingConfig {
  loss: string;
  optimizer: string;
  learning_rate: number;
  epochs: number;
}

interface AppState {
  // Workflow identity
  graphId: string | null;
  setGraphId: (id: string | null) => void;

  courseId: string | null;
  setCourseId: (id: string | null) => void;

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

  // Training Configuration
  trainingConfig: TrainingConfig;
  setTrainingConfig: (config: Partial<TrainingConfig>) => void;

  // Last training result (populated after a successful training run)
  lastTrainingResult: {
    accuracy: number | null;
    loss: number | null;
    epochs: number | null;
    training_time_seconds: number | null;
  } | null;
  setLastTrainingResult: (result: {
    accuracy: number | null;
    loss: number | null;
    epochs: number | null;
    training_time_seconds: number | null;
  } | null) => void;

  // Lesson State
  stepIndex: number;
  setStepIndex: (index: number) => void;
  checkResult: CheckResult | null;
  setCheckResult: (result: CheckResult | null) => void;
  hintLevel: number;
  setHintLevel: (level: number | ((prev: number) => number)) => void;
}

export const useStore = create<AppState>((set, get) => ({
  graphId: null,
  setGraphId: (id) => set({ graphId: id }),

  courseId: null,
  setCourseId: (id) => set({ courseId: id }),

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
      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      const targetNode = state.nodes.find((n) => n.id === connection.target);

      let edgeColor = '#8b5cf6'; // default
      if (sourceNode && sourceNode.data.blockType) {
        const def = getBlockDefinition(sourceNode.data.blockType as string);
        if (def) edgeColor = def.color;
      }

      const validation =
        sourceNode && targetNode
          ? validateConnection(sourceNode, targetNode)
          : { valid: true, severity: 'none' as const, message: '' };

      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}`,
        type: 'wire',
        data: {
          color: edgeColor,
          validationSeverity: validation.severity,
          validationMessage: validation.message,
        },
      } as Edge;

      return {
        edges: addEdge(newEdge, state.edges),
      };
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  updateNodeData: (nodeId, newData) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      });

      // Re-validate any edge that touches the updated node
      const updatedEdges = state.edges.map((edge) => {
        if (edge.source !== nodeId && edge.target !== nodeId) return edge;

        const srcNode = updatedNodes.find((n) => n.id === edge.source);
        const tgtNode = updatedNodes.find((n) => n.id === edge.target);
        if (!srcNode || !tgtNode) return edge;

        const validation = validateConnection(srcNode, tgtNode);
        return {
          ...edge,
          data: {
            ...edge.data,
            validationSeverity: validation.severity,
            validationMessage: validation.message,
          },
        };
      });

      return { nodes: updatedNodes, edges: updatedEdges };
    });
  },

  lastTrainingResult: null,
  setLastTrainingResult: (result) => set({ lastTrainingResult: result }),

  trainingConfig: {
    loss: "CrossEntropy",
    optimizer: "Adam",
    learning_rate: 0.001,
    epochs: 5,
  },

  setTrainingConfig: (config) => {
    set((state) => ({
      trainingConfig: {
        ...state.trainingConfig,
        ...config,
      },
    }));
  },

  stepIndex: 0,
  setStepIndex: (stepIndex) => set({ stepIndex }),
  checkResult: null,
  setCheckResult: (checkResult) => set({ checkResult }),
  hintLevel: 0,
  setHintLevel: (level) => {
    if (typeof level === 'function') {
      set((state) => ({ hintLevel: level(state.hintLevel) }));
    } else {
      set({ hintLevel: level });
    }
  },
}));
