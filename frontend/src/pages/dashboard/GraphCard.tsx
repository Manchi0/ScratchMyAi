import { useNavigate } from 'react-router-dom';
import { ReactFlow, type Node, type Edge, Handle, Position } from '@xyflow/react';
import { Button } from "@heroui/react";
import { Trash2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';

interface GraphCardProps {
    id: string;
    title: string;
    updatedAt: string;
    nodes?: Node[];
    edges?: Edge[];
    onDelete: (id: string) => void;
}

const PreviewNode = ({ data }: any) => {
    return (
        <div style={data.style} className="shadow-sm">
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
};

const nodeTypes = { previewNode: PreviewNode };

export function GraphCard({ id, title, updatedAt, nodes, edges, onDelete }: GraphCardProps) {
    const navigate = useNavigate();

    const formattedDate = new Date(updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    // Create minimalistic nodes for the preview
    const previewNodes = (nodes || []).map(n => {
        const blockType = (n.data?.blockType as string)?.toLowerCase() || '';
        
        let bgColor = '#e4e4e7'; // default gray
        if (blockType === 'dataset') bgColor = '#10b981'; // green blob
        else if (blockType === 'linear' || blockType === 'conv2d') bgColor = '#6366f1'; // indigo blob
        else if (blockType === 'relu' || blockType === 'softmax') bgColor = '#f59e0b'; // amber blob
        else if (n.type === 'inputNode') bgColor = '#10b981';
        else if (n.type === 'outputNode') bgColor = '#ef4444'; // red blob

        return {
            ...n,
            type: 'previewNode',
            data: { 
                style: {
                    background: bgColor,
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '24px',
                }
            },
        };
    });

    const previewEdges = (edges || []).map(e => ({
        ...e,
        sourceHandle: null,
        targetHandle: null,
        style: { stroke: '#d4d4d4', strokeWidth: 1.5 },
        animated: false
    }));

    return (
        <div
            onClick={() => navigate(`/graph/${id}`)}
            className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md cursor-pointer transition-shadow relative group"
        >
            <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm z-10 border border-[#e8e8e8] text-neutral-400 hover:bg-red-50 hover:text-red-500 w-8 h-8 min-w-8"
            >
                <Trash2 size={14} />
            </Button>

            <div className="h-32 bg-[#faf9f5] rounded-lg mb-4 flex items-center justify-center border border-[#e8e8e8] overflow-hidden">
                {!previewNodes.length ? (
                    <span className="text-neutral-400 text-sm">Empty Graph</span>
                ) : (
                    <div className="w-full h-full pointer-events-none">
                        <ReactFlow
                            nodes={previewNodes}
                            edges={previewEdges}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.1 }}
                            zoomOnScroll={false}
                            panOnDrag={false}
                            zoomOnPinch={false}
                            zoomOnDoubleClick={false}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            proOptions={{ hideAttribution: true }}
                        />
                    </div>
                )}
            </div>
            <h3 className="font-medium text-neutral-800">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1">{formattedDate}</p>
        </div>
    );
}
