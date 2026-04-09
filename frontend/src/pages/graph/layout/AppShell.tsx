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
import { Hand, MousePointer2, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Dock, DockIcon } from "@/components/ui/dock";

import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";
import { mlpIntro } from "@/pages/learn/courses/mlpIntro";
import { cnnMnist } from "@/pages/learn/courses/cnnMnist";
import { whatIsRnn } from "@/pages/learn/courses/whatIsRnn";
import { makingLstms } from "@/pages/learn/courses/makingLstms";
import { firstTransformer } from "@/pages/learn/courses/firstTransformer";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { NodeRender } from "@/pages/graph/canvas/NodeRender";
import { WireEdge } from "@/pages/graph/canvas/WireEdge";
import { getBlockDefinition } from "@/blocks/BlockRegistry";
import { loadGraph } from "@/lib/graphFunctions";
import { getTrainedModelMeta } from "@/lib/modelFunctions";
import { validateConnection } from "@/lib/connectionValidator";
import { ContextMenu, type ContextMenuData } from "./ContextMenu";
import { BlockInspector } from "@/components/BlockInspector";

import type { Course } from "@/pages/learn/courses/mlpIntro";

const LESSON_COURSES: Record<string, Course> = {
  'mlp-intro': mlpIntro,
  'simple-cnn-mnist': cnnMnist,
  'what-is-rnn': whatIsRnn,
  'making-lstms': makingLstms,
  'first-transformer': firstTransformer,
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
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  const handleZoomIn = () => zoomIn({ duration: 200 });
  const handleZoomOut = () => zoomOut({ duration: 200 });
  const handleFitView = () => fitView({ duration: 400, padding: 0.1 });

  const displayZoom = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex">
      <Dock direction="middle" className="bg-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-[#eeeeee] px-2 h-14 rounded-full items-center gap-1">
        <DockIcon 
          onClick={() => setInteractionMode('select')}
          className="cursor-pointer transition-colors text-[#78716c] hover:text-[#1c1917]"
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${interactionMode === 'select' ? 'bg-[#f1f1f1] text-[#1c1917]' : ''}`}>
            <MousePointer2 className="w-5 h-5" strokeWidth={2} />
          </div>
        </DockIcon>
        
        <DockIcon 
          onClick={() => setInteractionMode('pan')}
          className="cursor-pointer transition-colors text-[#78716c] hover:text-[#1c1917]"
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${interactionMode === 'pan' ? 'bg-[#f1f1f1] text-[#1c1917]' : ''}`}>
             <Hand className="w-5 h-5" strokeWidth={2} />
          </div>
        </DockIcon>

        <div className="w-[1px] h-6 bg-[#e5e5e5] mx-1" />

        <DockIcon onClick={handleZoomOut} className="cursor-pointer text-[#78716c] hover:text-[#1c1917] transition-colors">
          <ZoomOut className="w-5 h-5" strokeWidth={2} />
        </DockIcon>

        <div className="w-12 text-center text-[13px] font-semibold text-[#8a8a8a] select-none">
          {displayZoom}%
        </div>

        <DockIcon onClick={handleZoomIn} className="cursor-pointer text-[#78716c] hover:text-[#1c1917] transition-colors">
          <ZoomIn className="w-5 h-5" strokeWidth={2} />
        </DockIcon>

        <div className="w-[1px] h-6 bg-[#e5e5e5] mx-1" />

        <DockIcon onClick={handleFitView} className="cursor-pointer text-[#78716c] hover:text-[#1c1917] transition-colors" title="Fit to screen">
          <Maximize className="w-[18px] h-[18px]" strokeWidth={2} />
        </DockIcon>
      </Dock>
    </div>
  );
}

function AppShellContent({ lessonCourseId: initialLessonCourseId }: { lessonCourseId?: string }) {
  const { id } = useParams<{ id?: string }>();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('select');
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [menu, setMenu] = useState<ContextMenuData | null>(null);

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
    courseId,
    setCourseId,
    setStepIndex,
    setCheckResult,
    setHintLevel,
    inspectorNodeId,
    setInspectorNodeId,
    setLastTrainedModelId,
    setLastTrainingResult,
  } = useStore();

  const lessonCourse = courseId ? LESSON_COURSES[courseId] : undefined;
  const user = useAuthStore(s => s.user);


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


  // Load existing graph or reset to a blank canvas
  useEffect(() => {
    if (id) {
      loadGraph(id)
        .then(async (row) => {
          setWorkflowId(row.id);
          setTitle(row.title);
          setNodes(row.nodes);
          setEdges(row.edges);
          setCourseId(row.course_id || null);
          setCheckResult(null);
          setHintLevel(0);

          // If it's a course graph, try to fetch progress to set step
          if (row.course_id && user) {
            try {
              const { getSingleCourseProgress } = await import('@/lib/courseFunctions');
              const progress = await getSingleCourseProgress(user.id, row.course_id);
              if (progress) {
                const courseDef = LESSON_COURSES[row.course_id];
                if (courseDef) {
                  // Calculate approximate step index from percentage
                  const index = Math.min(
                    courseDef.steps.length - 1,
                    Math.floor((progress.progress_percentage / 100) * (courseDef.steps.length - 1))
                  );
                  setStepIndex(index);
                }
              }
            } catch (err) {
              console.error("Failed to fetch course progress for resumption:", err);
            }
          }

          if (row.training_config) {
            setTrainingConfig(row.training_config);
          }

          setLastTrainedModelId(row.trained_model_id ?? null);

          if (row.trained_model_id) {
            getTrainedModelMeta(row.trained_model_id)
              .then((meta) => setLastTrainingResult(meta))
              .catch(() => {/* non-fatal — inspector will show untrained state */});
          } else {
            setLastTrainingResult(null);
          }
        })
        .catch((err) => console.error("Failed to load graph:", err));
    } else {
      // New workflow — reset to defaults
      setLastTrainedModelId(null);
      setLastTrainingResult(null);
      setWorkflowId(null);
      setCourseId(initialLessonCourseId || null);
      
      const courseIds = Object.keys(LESSON_COURSES);
      const courseIndex = courseIds.indexOf(initialLessonCourseId || "");
      setTitle(initialLessonCourseId && courseIndex !== -1 ? `Course ${courseIndex + 1}` : "Untitled");
      
      setNodes([]);
      setEdges([]);
      setStepIndex(0);
      setCheckResult(null);
      setHintLevel(0);
      // Reset training config to defaults
      setTrainingConfig({
        loss: "CrossEntropy",
        optimizer: "Adam",
        learning_rate: 0.001,
        epochs: 5,
      });
    }
  }, [id, setWorkflowId, setTitle, setNodes, setEdges, setTrainingConfig, setCourseId, setStepIndex, setCheckResult, setHintLevel, setLastTrainedModelId, setLastTrainingResult, initialLessonCourseId, user]);

  const isValidConnection = useCallback((connection: any) => {
    const { nodes: currentNodes } = useStore.getState();
    const srcNode = currentNodes.find((n) => n.id === connection.source);
    const tgtNode = currentNodes.find((n) => n.id === connection.target);
    if (!srcNode || !tgtNode) return true;
    return validateConnection(srcNode, tgtNode).valid;
  }, []);

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
      <BlockInspector nodeId={inspectorNodeId} onClose={() => setInspectorNodeId(null)} />
      <div className="flex flex-col h-screen w-full bg-[#fcfcfc] text-[#1c1917] overflow-hidden">
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
              isValidConnection={isValidConnection}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onNodeContextMenu={(e, node) => {
                e.preventDefault();
                setMenu({ id: node.id, top: e.clientY, left: e.clientX, type: 'node' });
              }}
              onEdgeContextMenu={(e, edge) => {
                e.preventDefault();
                setMenu({ id: edge.id, top: e.clientY, left: e.clientX, type: 'edge' });
              }}
              onPaneContextMenu={(e) => {
                e.preventDefault();
                setMenu({ top: e.clientY, left: e.clientX, type: 'pane' });
              }}
              onPaneClick={() => setMenu(null)}
              onNodeDragStart={() => setMenu(null)}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              minZoom={0.1}
              panOnDrag={interactionMode === 'pan' ? [0, 1] : [1]}
              selectionOnDrag={interactionMode === 'select'}
              panOnScroll={true}
              selectionMode={SelectionMode.Partial}
              selectNodesOnDrag={true}
              deleteKeyCode={["Backspace", "Delete"]}
              proOptions={{ hideAttribution: true }}
              style={{ backgroundColor: "#fcfcfc" }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
              <Background variant={BackgroundVariant.Dots} gap={20} size={2} color="#d4d4d4" />
              
              <CanvasDock 
                interactionMode={interactionMode} 
                setInteractionMode={setInteractionMode} 
              />

              {/* <MiniMap nodeColor="#d4d4d4" maskColor="rgba(0,0,0,0.08)" /> */}
            </ReactFlow>
          </div>

          {lessonCourse ? <RightSidebar course={lessonCourse} /> : <RightSidebar />}
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
