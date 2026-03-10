import { useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TitleBar } from "./TitleBar";
import { StatusBar } from "./StatusBar";
import { Sidebar } from "./Sidebar";
import { useStore } from "@/store/useStore";
import { NodeRender } from "@/pages/graph/canvas/NodeRender";
import { WireEdge } from "@/pages/graph/canvas/WireEdge";
import { getBlockDefinition } from "@/blocks/BlockRegistry";
import { loadWorkflow } from "@/lib/supabaseFunctions";

const nodeTypes = {
  neuralBlock: NodeRender,
};

const edgeTypes = {
  wire: WireEdge,
};

export function AppShell() {
  const { id } = useParams<{ id?: string }>();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    setTitle,
    setWorkflowId,
  } = useStore();

  // Load existing workflow or reset to a blank canvas
  useEffect(() => {
    if (id) {
      loadWorkflow(id)
        .then((row) => {
          setWorkflowId(row.id);
          setTitle(row.title);
          setNodes(row.nodes);
          setEdges(row.edges);
        })
        .catch((err) => console.error("Failed to load workflow:", err));
    } else {
      // New workflow — reset to defaults
      setWorkflowId(null);
      setTitle("Untitled");
      setNodes([]);
      setEdges([]);
    }
  }, [id, setWorkflowId, setTitle, setNodes, setEdges]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = e.dataTransfer.getData("application/reactflow");

      if (!type || !reactFlowBounds) {
        return;
      }

      // Check if definition exists
      const definition = getBlockDefinition(type);
      if (!definition) return;

      // Ensure drop is inside the canvas
      let position = {
        x: e.clientX - reactFlowBounds.left,
        y: e.clientY - reactFlowBounds.top,
      };

      // Create new node using BlockDefinition method
      const newNode = definition.createNode(position);

      setNodes([...nodes, newNode]);
    },
    [reactFlowWrapper, nodes, setNodes]
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
              proOptions={{ hideAttribution: true }}
              style={{ backgroundColor: "#f8f7f4" }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d4" />
              <Controls showInteractive={false} />
              {/* <MiniMap nodeColor="#d4d4d4" maskColor="rgba(0,0,0,0.08)" /> */}
            </ReactFlow>
          </div>
        </div>

        <StatusBar />
      </div>
    </>
  );
}
