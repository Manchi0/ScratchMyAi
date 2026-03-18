import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Hand, MousePointer2 } from "lucide-react";

import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { Sidebar } from "./Sidebar";
import { AIAgentSidebar } from "./AIAgentSidebar";
import { LessonSidebar } from "@/pages/learn/LessonSidebar";
import { mlpIntro } from "@/pages/learn/courses/mlpIntro";
import { cnnMnist } from "@/pages/learn/courses/cnnMnist";
import { useStore } from "@/store/useStore";
import { NodeRender } from "@/pages/graph/canvas/NodeRender";
import { WireEdge } from "@/pages/graph/canvas/WireEdge";
import { getBlockDefinition } from "@/blocks/BlockRegistry";
import { loadGraph } from "@/lib/graphFunctions";

import type { Course } from "@/pages/learn/courses/mlpIntro";

const LESSON_COURSES: Record<string, Course> = {
  'mlp-intro': mlpIntro,
  'simple-cnn-mnist': cnnMnist,
};

const nodeTypes = {
  neuralBlock: NodeRender,
};

const edgeTypes = {
  wire: WireEdge,
};

function AppShellContent({ lessonCourseId }: { lessonCourseId?: string }) {
  const { id } = useParams<{ id?: string }>();
  const lessonCourse = lessonCourseId ? LESSON_COURSES[lessonCourseId] : undefined;
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('select');
  const { screenToFlowPosition, fitView } = useReactFlow();

  // References for middle mouse button temporary pan mode
  const interactionModeRef = useRef(interactionMode);
  interactionModeRef.current = interactionMode;
  const previousModeRef = useRef<'pan' | 'select' | null>(null);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 1) { // Middle mouse button
        previousModeRef.current = interactionModeRef.current;
        setInteractionMode('pan');
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button === 1 && previousModeRef.current) {
        setInteractionMode(previousModeRef.current);
        previousModeRef.current = null;
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    setTitle,
    setGraphId: setWorkflowId,
    setTrainingConfig,
  } = useStore();

  // Load existing graph or reset to a blank canvas
  useEffect(() => {
    if (id) {
      loadGraph(id)
        .then((row) => {
          setWorkflowId(row.id);
          setTitle(row.title);
          setNodes(row.nodes);
          setEdges(row.edges);
          if (row.training_config) {
            setTrainingConfig(row.training_config);
          }
        })
        .catch((err) => console.error("Failed to load graph:", err));
    } else {
      // New workflow — reset to defaults
      setWorkflowId(null);
      setTitle("Untitled");
      setNodes([]);
      setEdges([]);
      // Reset training config to defaults
      setTrainingConfig({
        loss: "CrossEntropy",
        optimizer: "Adam",
        learning_rate: 0.001,
        epochs: 5,
      });
    }
  }, [id, setWorkflowId, setTitle, setNodes, setEdges, setTrainingConfig, fitView]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const type = e.dataTransfer.getData("application/reactflow");

      if (!type) {
        return;
      }

      // Check if definition exists
      const definition = getBlockDefinition(type);
      if (!definition) return;

      // Project the position using ReactFlow's helper
      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      // Create new node using BlockDefinition method
      const newNode = definition.createNode(position);

      setNodes([...nodes, newNode]);
    },
    [nodes, setNodes, screenToFlowPosition]
  );

  return (
    <>
      <div className="flex flex-col h-screen w-screen bg-[#f8f7f4] text-[#1c1917] overflow-hidden">
        <TitleBar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />

          {/* Center: Canvas */}
          <div className="flex-1 relative min-w-0" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={{ type: 'wire' }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              minZoom={0.1}
              panOnDrag={interactionMode === 'pan' ? [0, 1] : [1]}
              selectionOnDrag={interactionMode === 'select'}
              panOnScroll={true}
              selectionMode={SelectionMode.Partial}
              deleteKeyCode="Delete"
              proOptions={{ hideAttribution: true }}
              style={{ backgroundColor: "#f8f7f4" }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d4" />
              <Controls showInteractive={false} />

              {/* Interaction Mode Toolbar */}
              <div className="absolute bottom-24 left-3.5 z-10 flex flex-col bg-[#fefefe] shadow-[0_0_2px_1px_rgba(0,0,0,0.08)] rounded-[7px] overflow-hidden h-11.5 w-6">
                <button
                  onClick={() => setInteractionMode('pan')}
                  className={`w-[26px] h-[26px] flex items-center justify-center border border-[#eee] border-b-0 transition-colors ${interactionMode === 'pan'
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                    }`}
                  title="Pan Mode"
                >
                  <Hand size={14} />
                </button>
                <button
                  onClick={() => setInteractionMode('select')}
                  className={`w-[26px] h-[26px] flex items-center justify-center border border-[#eee] transition-colors ${interactionMode === 'select'
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                    }`}
                  title="Select Mode"
                >
                  <MousePointer2 size={14} />
                </button>
              </div>

              {/* <MiniMap nodeColor="#d4d4d4" maskColor="rgba(0,0,0,0.08)" /> */}
            </ReactFlow>
          </div>

          {lessonCourse ? <LessonSidebar course={lessonCourse} /> : <AIAgentSidebar />}
        </div>

        <StatusBar />
      </div>
    </>
  );
}

export function AppShell() {
  return (
    <ReactFlowProvider>
      <AppShellContent />
    </ReactFlowProvider>
  );
}

export function LessonShell() {
  const { courseId } = useParams<{ courseId: string }>();
  return (
    <ReactFlowProvider>
      <AppShellContent lessonCourseId={courseId} />
    </ReactFlowProvider>
  );
}
