import { Blocks, Cable } from "lucide-react";
import { useStore } from "@/store/useStore";

export function StatusBar() {
  const nodeCount = useStore((state) => state.nodes.length);
  const edgeCount = useStore((state) => state.edges.length);

  return (
    <div className="flex items-center h-7 px-4 border-t border-[#e8e7e2] bg-white text-[11px] text-[#78716c] gap-4 shrink-0">
      <div className="flex items-center gap-1.5">
        <Blocks className="w-3 h-3" />
        <span>{nodeCount} block{nodeCount !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Cable className="w-3 h-3" />
        <span>{edgeCount} connection{edgeCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
