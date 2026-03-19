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
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Hand, MousePointer2, ZoomIn, ZoomOut } from "lucide-react";
import { Dock, DockIcon } from "@/components/ui/dock";

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

function CanvasDock({
  interactionMode,
  setInteractionMode,
}: {
  interactionMode: 'pan' | 'select';
  setInteractionMode: (mode: 'pan' | 'select') => void;
}) {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  const handleZoomIn = () => zoomIn({ duration: 200 });
  const handleZoomOut = () => zoomOut({ duration: 200 });
  const displayZoom = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex">
      <Dock direction="middle" className="bg-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-[#eeeeee] px-2 h-14 rounded-full items-center gap-1">
        <DockIcon 
          onClick={() => setInteractionMode('select')}
          className={`cursor-pointer w-10 h-10 rounded-xl transition-colors ${
            interactionMode === 'select' 
              ? 'bg-[#f5f5f5] text-[#1c1917]' 
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          <MousePointer2 size={20} strokeWidth={2} />
        </DockIcon>
        
        <DockIcon 
          onClick={() => setInteractionMode('pan')}
          className={`cursor-pointer w-10 h-10 rounded-xl transition-colors ${
            interactionMode === 'pan' 
              ? 'bg-[#f5f5f5] text-[#1c1917]' 
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          <Hand size={20} strokeWidth={2} />
        </DockIcon>

        <div className="w-[1px] h-6 bg-[#e5e5e5] mx-1" />

        <DockIcon onClick={handleZoomOut} className="cursor-pointer w-10 h-10 text-[#78716c] hover:text-[#1c1917] rounded-xl transition-colors">
          <ZoomOut size={20} strokeWidth={2} />
        </DockIcon>

        <div className="w-12 text-center text-[13px] font-semibold text-[#8a8a8a] select-none">
          {displayZoom}%
        </div>

        <DockIcon onClick={handleZoomIn} className="cursor-pointer w-10 h-10 text-[#78716c] hover:text-[#1c1917] rounded-xl transition-colors">
          <ZoomIn size={20} strokeWidth={2} />
        </DockIcon>
      </Dock>
    </div>
  );
}

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
              
              <CanvasDock 
                interactionMode={interactionMode} 
                setInteractionMode={setInteractionMode} 
              />

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
