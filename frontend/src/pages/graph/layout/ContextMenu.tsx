import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, PlusCircle, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getBlockDefinition, BlockRegistry } from '@/blocks/BlockRegistry';
import { useReactFlow } from '@xyflow/react';

export type ContextMenuData = {
  id?: string;
  top: number;
  left: number;
  type: 'node' | 'pane' | 'edge';
};

interface ContextMenuProps {
  menu: ContextMenuData;
  onClose: () => void;
}

export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const { nodes, edges, setNodes, setEdges } = useStore();
  const { screenToFlowPosition } = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const handleDuplicateNode = () => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const nodesToDuplicate = selectedNodes.some(n => n.id === menu.id) 
      ? selectedNodes 
      : nodes.filter(n => n.id === menu.id);

    if (nodesToDuplicate.length === 0) return;

    const newNodes = nodesToDuplicate.map((node) => {
      const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      return {
        ...node,
        id: newId,
        selected: true,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
      };
    });

    setNodes([
      ...nodes.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    onClose();
  };

  const handleDeleteNode = () => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const nodesToHandle = selectedNodes.some(n => n.id === menu.id) 
      ? selectedNodes 
      : nodes.filter(n => n.id === menu.id);

    const idsToRemove = nodesToHandle.map(n => n.id);
    if (idsToRemove.length === 0) return;

    setNodes(nodes.filter((n) => !idsToRemove.includes(n.id)));
    setEdges(edges.filter((e) => !idsToRemove.includes(e.source) && !idsToRemove.includes(e.target)));
    onClose();
  };

  const handleDeleteEdge = () => {
    if (!menu.id) return;
    setEdges(edges.filter((e) => e.id !== menu.id));
    onClose();
  };

  const handleAddNode = (type: string) => {
    const def = getBlockDefinition(type);
    if (!def) return;
    
    const position = screenToFlowPosition({ x: menu.left, y: menu.top });
    const newNode = def.createNode(position);
    setNodes([...nodes.map(n => ({...n, selected: false})), { ...newNode, selected: true }]);
    onClose();
  };

  const selectedNodes = nodes.filter(n => n.selected);
  const isMultiNode = selectedNodes.length > 1 && selectedNodes.some(n => n.id === menu.id);

  return (
    <div
      ref={ref}
      style={{ top: menu.top, left: menu.left }}
      className="fixed z-50 min-w-[160px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-[#e5e5e5] p-1.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {menu.type === 'node' && (
        <>
          <button
            onClick={handleDuplicateNode}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-[#333] hover:bg-[#f5f5f5] hover:text-[#111] rounded-md transition-colors"
          >
            <Copy size={14} className="text-[#777]" />
            Duplicate {isMultiNode ? 'Blocks' : 'Block'}
          </button>
          
          <div className="h-[1px] bg-[#f0f0f0] my-1 mx-1" />
          
          <button
            onClick={handleDeleteNode}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={14} />
            Delete {isMultiNode ? 'Blocks' : 'Block'}
          </button>
        </>
      )}

      {menu.type === 'edge' && (
        <button
          onClick={handleDeleteEdge}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <X size={14} />
          Delete Connection
        </button>
      )}

      {menu.type === 'pane' && (
        <div className="flex flex-col">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#999] uppercase tracking-wider">
            Add Block
          </div>
          {Object.entries(BlockRegistry).map(([type, block]) => {
            const Icon = block.icon;
            return (
              <button
                key={type}
                onClick={() => handleAddNode(type)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-medium text-[#333] hover:bg-[#f5f5f5] hover:text-[#111] rounded-md transition-colors"
              >
                <Icon size={14} className="text-[#777]" />
                {block.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
