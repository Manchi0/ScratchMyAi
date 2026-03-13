import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BlockRegistry } from '@/blocks/BlockRegistry';

export function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categories = ['input', 'output', 'layer', 'activation'] as const;
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    input: true,
    output: true,
    layer: true,
    activation: true,
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-[#e8e7e2] p-4 flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold">Blocks</h2>
      </div>
      
      <div className="flex flex-col gap-6">
        {categories.map((category) => {
          const blocksInCategory = Object.values(BlockRegistry).filter(
            (block) => block.category === category
          );

          if (blocksInCategory.length === 0) return null;
          const isExpanded = expandedCategories[category] ?? true;
          const CategoryIcon = isExpanded ? ChevronDown : ChevronRight;

          return (
            <div key={category} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-500 transition-colors"
              >
                <span>{category}s</span>
                <CategoryIcon size={14} />
              </button>
              {isExpanded && <div className="flex flex-col gap-2">
                {blocksInCategory.map((block) => {
                  const Icon = block.icon;
                  return (
                  <div
                    key={block.type}
                    className="p-3 border rounded cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow bg-gray-50 flex items-center gap-3"
                    onDragStart={(event) => onDragStart(event, block.type)}
                    draggable
                    style={{ borderColor: `${block.color}40` }} // 25% opacity border
                  >
                    <div 
                      className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: block.color }}
                    >
                      {Icon && <Icon size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{block.title}</span>
                  </div>
                )})}
              </div>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
