import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getBlockDefinition } from '@/blocks/BlockRegistry';
import { Settings } from 'lucide-react';

export const NodeRender = memo(({ data, selected }: NodeProps) => {
  const blockType = data.blockType as string;
  const params = data.params as Record<string, any>;
  
  const definition = getBlockDefinition(blockType);

  if (!definition) {
    return (
      <div className="bg-red-500 text-white p-2 rounded shadow">
        Unknown block: {blockType}
      </div>
    );
  }

  const { title, color, inputs, outputs } = definition;

  return (
    <div 
      className={`relative min-w-[150px] bg-white rounded-lg shadow-md border-2 transition-colors ${
        selected ? 'border-primary' : 'border-transparent'
      }`}
      style={{ borderColor: selected ? color : '#e5e7eb' }} // Fallback to gray-200 if not selected
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 rounded-t-lg border-b border-gray-100"
        style={{ backgroundColor: `${color}15` }} // 15% opacity tint
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-sm text-gray-800">{title}</span>
        </div>
        <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
      </div>

      {/* Body / Params */}
      <div className="p-3 bg-white rounded-b-lg">
        {Object.entries(params).length > 0 ? (
          <div className="flex flex-col gap-2">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{key}</span>
                <span className="text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 font-mono">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-center text-gray-400 italic py-1">
            No parameters
          </div>
        )}
      </div>

      {/* Input Handles */}
      {inputs.map((input, index) => {
        // Distribute handles along the left edge
        const topOffset = `${((index + 1) / (inputs.length + 1)) * 100}%`;
        return (
          <Handle
            key={`in-${input.id}`}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{ 
              top: topOffset, 
              background: '#fff', 
              border: '2px solid', 
              borderColor: color,
              width: '10px',
              height: '10px'
            }}
            // Optional: tooltip for 'input.label'
            title={input.label}
          />
        );
      })}

      {/* Output Handles */}
      {outputs.map((output, index) => {
        // Distribute handles along the right edge
        const topOffset = `${((index + 1) / (outputs.length + 1)) * 100}%`;
        return (
          <Handle
            key={`out-${output.id}`}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{ 
              top: topOffset, 
              background: '#fff', 
              border: '2px solid', 
              borderColor: color,
              width: '10px',
              height: '10px'
            }}
            title={output.label}
          />
        );
      })}
    </div>
  );
});

NodeRender.displayName = 'NodeRender';
