import React, { useState, type ElementType } from 'react';
import { Accordion } from '@heroui/react';
import { ChevronRight, HardDrive, Layers, Zap, Cpu, Box, Search } from 'lucide-react';
import { BlockRegistry } from '@/blocks/BlockRegistry';

const categoryIcons: Record<string, ElementType> = {
  input: HardDrive,
  layer: Layers,
  activation: Zap,
  output: Box,
};

const categoryLabels: Record<string, string> = {
  input: 'Inputs',
  output: 'Output',
  layer: 'Layers',
  activation: 'Activations',
};

const categoryColors: Record<string, string> = {
  input: '#8b5cf6', // Violet
  output: '#ec4899', // Pink
  layer: '#3b82f6', // Blue
  activation: '#22c55e', // Green
};

const categoryOrder = ['input', 'layer', 'activation', 'output'] as const;

export function Sidebar() {
  const [search, setSearch] = useState('');

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const query = search.trim().toLowerCase();
  const filteredBlocks = query
    ? Object.values(BlockRegistry).filter((block) =>
        block.title.toLowerCase().includes(query) || block.type.toLowerCase().includes(query)
      )
    : [];

  return (
    <aside className="hidden md:flex w-56 bg-white border-r border-[#e8e8e8] flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e8e8e8] shrink-0">
        <h2 className="text-[13px] font-semibold text-[#111] uppercase tracking-wider">Blocks</h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#e8e8e8] shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#e8e8e8] bg-white">
          <Search size={12} className="text-[#999] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="flex-1 text-[12px] text-[#333] placeholder-[#aaa] outline-none min-w-0"
            style={{ background: 'none' }}
          />
        </div>
      </div>

      {/* Block categories */}
      <div className="flex-1 overflow-y-auto">
        {query ? (
          <div className="px-2 py-2 flex flex-col gap-1.5">
            {filteredBlocks.length === 0 ? (
              <p className="text-[12px] text-[#aaa] text-center py-4">No blocks found</p>
            ) : (
              filteredBlocks.map((block) => {
                const Icon = block.icon;
                return (
                  <div
                    key={block.type}
                    className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing hover:brightness-95 transition-all"
                    style={{
                      backgroundColor: `${block.color}0D`,
                      borderColor: `${block.color}30`,
                    }}
                    onDragStart={(event) => onDragStart(event, block.type)}
                    draggable
                  >
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                      style={{ backgroundColor: `${block.color}18` }}
                    >
                      {Icon && <Icon size={13} style={{ color: block.color }} />}
                    </div>
                    <span className="text-[12px] font-medium text-[#555] group-hover:text-[#111] transition-colors">
                      {block.title}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <Accordion
            allowsMultipleExpanded
            defaultExpandedKeys={['input', 'layer', 'activation', 'output']}
            className="px-0 gap-0"
          >
            {categoryOrder.map((category) => {
              const blocksInCategory = Object.values(BlockRegistry).filter(
                (block) => block.category === category
              );
              if (blocksInCategory.length === 0) return null;

              return (
                <Accordion.Item key={category} id={category}>
                  <Accordion.Heading>
                    <Accordion.Trigger className="group flex items-center justify-between w-full px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest hover:bg-[#fafafa] transition-colors cursor-pointer">
                      <span className="flex items-center gap-1.5" style={{ color: categoryColors[category] }}>
                        {(() => { const CatIcon = categoryIcons[category]; return CatIcon ? <CatIcon size={12} /> : null; })()}
                        {categoryLabels[category]}
                      </span>
                      <ChevronRight size={12} className="transition-transform duration-200 group-aria-expanded:rotate-90" />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="px-2 pb-2 pt-0.5">
                      <div className="flex flex-col gap-1.5">
                        {blocksInCategory.map((block) => {
                          const Icon = block.icon;
                          return (
                            <div
                              key={block.type}
                              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing hover:brightness-95 transition-all"
                              style={{
                                backgroundColor: `${block.color}0D`,
                                borderColor: `${block.color}30`,
                              }}
                              onDragStart={(event) => onDragStart(event, block.type)}
                              draggable
                            >
                              <div
                                className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
                                style={{ backgroundColor: `${block.color}18` }}
                              >
                                {Icon && <Icon size={13} style={{ color: block.color }} />}
                              </div>
                              <span className="text-[12px] font-medium text-[#555] group-hover:text-[#111] transition-colors">
                                {block.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
      </div>
    </aside>
  );
}
