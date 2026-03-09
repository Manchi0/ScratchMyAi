import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getBlockDefinition } from '@/blocks/BlockRegistry';
import { useStore } from '@/store/use-store';
import { Upload } from 'lucide-react';

export const NodeRender = memo(({ id, data, selected }: NodeProps) => {
  const blockType = data.blockType as string;
  const params = data.params as Record<string, any> || {};
  const updateNodeData = useStore((state) => state.updateNodeData);
  
  const definition = getBlockDefinition(blockType);

  if (!definition) {
    return (
      <div className="bg-red-500 text-white p-2 rounded shadow">
        Unknown block: {blockType}
      </div>
    );
  }

  const { title, color, icon: Icon, inputs, outputs, params: paramDefs } = definition;

  const handleParamChange = (key: string, value: any) => {
    updateNodeData(id, {
      params: {
        ...params,
        [key]: value,
      }
    });
  };

  // ... (renderInput logic remains the same)

  const renderInput = (key: string, currentValue: any) => {
    const def = paramDefs[key];
    if (!def) return null;

    if (def.type === 'int' || def.type === 'float') {
      return (
        <input 
          type="number"
          className="nodrag w-16 text-right text-xs border rounded px-1 py-0.5 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-moz-appearance:textfield]"
          value={currentValue ?? def.default}
          min={def.min}
          max={def.max}
          step={def.type === 'int' ? 1 : 0.01}
          onChange={(e) => {
            const val = def.type === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
            if (!isNaN(val)) handleParamChange(key, val);
          }}
        />
      );
    }

    if (def.type === 'boolean') {
      return (
        <input 
          type="checkbox"
          className="nodrag rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
          checked={currentValue ?? def.default}
          onChange={(e) => handleParamChange(key, e.target.checked)}
        />
      );
    }

    if (def.type === 'select') {
      return (
        <select 
          className="nodrag text-xs border rounded px-1 py-0.5 bg-white max-w-[80px]"
          value={currentValue ?? def.default}
          onChange={(e) => handleParamChange(key, e.target.value)}
        >
          {def.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    
    if (def.type === 'file') {
       return (
         <div className="flex items-center gap-2 max-w-[120px]">
           <label className="nodrag cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 p-1 rounded border border-gray-200 transition-colors shrink-0">
             <Upload size={14} />
             <input 
               type="file" 
               accept={def.accept}
               className="hidden"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) handleParamChange(key, file.name);
               }}
             />
           </label>
           <span 
             className="text-[10px] text-gray-500 truncate" 
             title={currentValue || 'Select file'}
           >
             {currentValue || 'none'}
           </span>
         </div>
       );
    }

    // Fallback string rendering
    const fallbackDef = def as any;
    return (
       <input 
          type="text"
          className="nodrag w-20 text-xs border rounded px-1 py-0.5"
          value={currentValue ?? fallbackDef.default}
          onChange={(e) => handleParamChange(key, e.target.value)}
        />
    );
  };

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
            className="flex items-center justify-center w-6 h-6 rounded-full shadow-sm" 
            style={{ backgroundColor: color }}
          >
            {Icon && <Icon size={14} className="text-white" />}
          </div>
          <span className="font-semibold text-sm text-gray-800">{title}</span>
        </div>
      </div>

      {/* Body / Params */}
      <div className="p-3 bg-white rounded-b-lg">
        {Object.entries(paramDefs || {}).length > 0 ? (
          <div className="flex flex-col gap-2">
            {Object.entries(paramDefs).map(([key, def]) => (
              <div key={key} className="flex justify-between items-center text-xs gap-3">
                <span className="text-gray-600 font-medium" title={def.label || key}>
                  {def.label || key}
                </span>
                {renderInput(key, params[key])}
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
