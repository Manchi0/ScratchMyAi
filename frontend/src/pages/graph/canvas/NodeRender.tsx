import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getBlockDefinition } from '@/blocks/BlockRegistry';
import { useStore } from '@/store/useStore';
import { Upload, Eye } from 'lucide-react';
import { Input, Select, ListBox, ListBoxItem } from '@heroui/react';

const categoryLabels: Record<string, string> = {
  input: 'DATA SOURCE',
  output: 'OUTPUT',
  layer: 'LAYER',
  activation: 'ACTIVATION',
};

export const NodeRender = memo(({ id, data, selected }: NodeProps) => {
  const blockType = data.blockType as string;
  const params = data.params as Record<string, any> || {};
  const updateNodeData = useStore((state) => state.updateNodeData);
  const setInspectorNodeId = useStore((state) => state.setInspectorNodeId);
  const [hovered, setHovered] = useState(false);

  const definition = getBlockDefinition(blockType);

  if (!definition) {
    return (
      <div className="bg-red-500 text-white p-2 rounded shadow">
        Unknown block: {blockType}
      </div>
    );
  }

  const { title, color, icon: Icon, inputs, outputs, params: paramDefs, category } = definition;

  const handleParamChange = (key: string, value: any) => {
    updateNodeData(id, {
      params: {
        ...params,
        [key]: value,
      }
    });
  };

  const renderInput = (key: string, currentValue: any) => {
    const def = paramDefs[key];
    if (!def) return null;

    if (def.type === 'int' || def.type === 'float') {
      return (
        <Input
          type="number"
          variant="secondary"
          className="nodrag h-6 min-w-[40px] max-w-[120px] min-h-6 min-h-0 py-0 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-1.5 shadow-none focus-within:border-[#111] transition-colors text-left text-[11px] text-[#333] font-medium appearance-none"
          style={{ width: `calc(${String(currentValue ?? def.default).length}ch + 36px)` }}
          value={String(currentValue ?? def.default)}
          min={def.min}
          max={def.max}
          step={def.type === 'int' ? 1 : 0.01}
          onChange={(e) => {
            const ev = e as any;
            if (!ev || !ev.target) return;
            const val = def.type === 'int' ? parseInt(ev.target.value, 10) : parseFloat(ev.target.value);
            if (!isNaN(val)) handleParamChange(key, val);
          }}
        />
      );
    }

    if (def.type === 'boolean') {
      return (
        <input
          type="checkbox"
          className="nodrag rounded border border-[#e8e8e8] outline-none text-[#111] bg-[#fafafa] h-3 w-3 cursor-pointer"
          style={{ accentColor: color }}
          checked={Boolean(currentValue ?? def.default)}
          onChange={(e) => handleParamChange(key, e.target.checked)}
        />
      );
    }

    if (def.type === 'select') {
      return (
        <Select
          className="nodrag !w-23"
          selectedKey={String(currentValue ?? def.default)}
          onSelectionChange={(selected) => handleParamChange(key, String(selected))}
        >
          <Select.Trigger className="!h-6 !min-h-0 !py-0 !w-23 border border-[#e8e8e8] rounded-md px-1.5 bg-[#fafafa] flex items-center justify-between outline-none focus-visible:border-[#111] shadow-none">
            <Select.Value className="!text-[11px] text-[#333] font-medium truncate flex-1 text-right" />
          </Select.Trigger>
          <Select.Popover className="min-w-[120px]">
            <ListBox>
              {def.options.map((opt: any) => (
                <ListBoxItem key={opt.value} id={opt.value} textValue={opt.label}>
                  <span className="text-[11px]">{opt.label}</span>
                </ListBoxItem>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      );
    }

    if (def.type === 'file') {
      return (
        <div className="flex items-center gap-1.5 w-24 justify-end">
          <span
            className="text-[10px] text-[#999] truncate flex-1 text-right min-w-0"
            title={currentValue || 'Select file'}
          >
            {currentValue || 'none'}
          </span>
          <label className="nodrag cursor-pointer bg-[#f5f5f5] hover:bg-[#eee] text-[#555] p-1 rounded-md border border-[#e0e0e0] transition-colors shrink-0">
            <Upload size={12} />
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
        </div>
      );
    }

    // Fallback string rendering
    const fallbackDef = def as any;
    return (
      <Input
        type="text"
        variant="secondary"
        className="nodrag w-20 h-6 min-h-6 min-h-0 py-0 rounded-md border border-[#e8e8e8] bg-[#fafafa] px-1.5 shadow-none focus-within:border-[#111] transition-colors text-[11px] text-[#333] font-medium"
        value={String(currentValue ?? fallbackDef.default)}
        onChange={(e) => {
            const ev = e as any;
            if (!ev || !ev.target) return;
            handleParamChange(key, ev.target.value);
        }}
      />
    );
  };

  return (
    <div
      className={`relative min-w-[180px] max-w-[240px] bg-white rounded-xl border-[2px] transition-all duration-200 ${
        selected ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
      }`}
      style={{
        borderColor: color,
        boxShadow: selected ? `0 0 0 8px ${color}33, 0 4px 20px rgba(0,0,0,0.15)` : undefined
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top color accent bar */}
      <div
        className="h-2.5 rounded-t-[10px] w-full bg-opacity-90"
        style={{ backgroundColor: color }}
      />

      {/* Eye / Inspect button — visible on hover or selected */}
      {(hovered || selected) && (
        <button
          className="nodrag absolute top-4 right-2 z-10 flex items-center justify-center w-5 h-5 rounded-md bg-white/80 hover:bg-white border border-[#e0e0e0] shadow-sm transition-all"
          style={{ color }}
          title="Inspect block"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setInspectorNodeId(id);
          }}
        >
          <Eye size={11} />
        </button>
      )}

      {/* Header area */}
      <div className="px-3.5 pt-2 pb-1.5">
        {/* Category label */}
        <p
          className="text-[9px] font-semibold uppercase tracking-widest mb-0.5"
          style={{ color: color }}
        >
          {categoryLabels[category] || category.toUpperCase()}
        </p>

        {/* Block title */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#111]">{title}</span>
        </div>
      </div>

      {/* Divider + Params */}
      {Object.entries(paramDefs || {}).length > 0 && (
        <>
          <div className="mx-3 border-t border-[#eee]" />
          <div className="px-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              {Object.entries(paramDefs).map(([key, def]) => {
                if (key === 'file' && 'dataset_source' in paramDefs) {
                  const source = params['dataset_source'] ?? paramDefs['dataset_source'].default;
                  if (source !== 'custom') return null;
                }

                return (
                  <div key={key} className="flex justify-between items-center text-xs gap-2">
                    <span className="text-[11px] text-[#777] font-medium truncate" title={def.label || key}>
                      {def.label || key}
                    </span>
                    {renderInput(key, params[key])}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Input Handles */}
      {inputs.map((input, index) => {
        const topPercent = ((index + 1) / (inputs.length + 1)) * 100;
        return (
          <Handle
            key={`in-${input.id}`}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{
              top: `${topPercent}%`,
              background: color,
              border: '2px solid white',
              width: '10px',
              height: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
            title={input.label}
          />
        );
      })}

      {/* Output Handles */}
      {outputs.map((output, index) => {
        const topPercent = ((index + 1) / (outputs.length + 1)) * 100;
        return (
          <Handle
            key={`out-${output.id}`}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{
              top: `${topPercent}%`,
              background: color,
              border: '2px solid white',
              width: '10px',
              height: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
            title={output.label}
          />
        );
      })}
    </div>
  );
});

NodeRender.displayName = 'NodeRender';
