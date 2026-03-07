import { useCallback, useRef } from "react";
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
import { useStore } from "@/store/use-store";

export function AppShell() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect 
  } = useStore();

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Placeholder for new block drop logic
    },
    []
  );

  return (
    <>
      <div className="flex flex-col h-screen w-screen bg-[#f8f7f4] text-[#1c1917] overflow-hidden">
        <TitleBar />

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Sidebar Placeholder */}
          <div className="w-64 bg-white border-r border-[#e8e7e2] p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Sidebar</h2>
            <p className="text-xs text-[#a8a29e]">Redo your block palette here.</p>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 relative min-w-0" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              fitView
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
