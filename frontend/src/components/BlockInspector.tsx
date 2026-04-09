import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import { X, AlertTriangle, BookOpen, BarChart2, Zap, Lock, Info, Code2, MessageSquare, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getBlockDefinition } from '@/blocks/BlockRegistry';
import { getPytorchSnippet, getParamCount, formatParamCount } from '@/lib/pytorchSnippet';
import { getModelWeights, type LayerWeightData } from '@/lib/modelFunctions';

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  input: '#8b5cf6',
  output: '#ec4899',
  layer: '#3b82f6',
  activation: '#22c55e',
};

const CATEGORY_LABELS: Record<string, string> = {
  input: 'DATA SOURCE',
  output: 'OUTPUT',
  layer: 'LAYER',
  activation: 'ACTIVATION',
};

// ─── Execution-order resolver ─────────────────────────────────────────────────
// Mirrors the Python resolve_connections logic in local_runner.py.
// Returns node IDs in sequential model order (dataset + output excluded).
// The index of a node in this list == its nn.Sequential index in the .pt file.

function resolveExecutionOrder(nodes: Node[], edges: Edge[]): string[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const successors = new Map<string, string[]>();
  const hasIncoming = new Set<string>();

  for (const edge of edges) {
    if (!successors.has(edge.source)) successors.set(edge.source, []);
    successors.get(edge.source)!.push(edge.target);
    hasIncoming.add(edge.target);
  }

  const heads = nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
  if (heads.length === 0) return [];

  let bestPath: string[] = [];

  for (const head of heads) {
    const path: string[] = [];
    let curr: string | undefined = head;
    const visited = new Set<string>();

    while (curr && !visited.has(curr)) {
      visited.add(curr);
      path.push(curr);
      const nexts = successors.get(curr) || [];
      curr = nexts[0];
    }

    const lastBt = (nodeMap.get(path[path.length - 1])?.data?.blockType as string) ?? '';
    const isOutputChain = lastBt === 'output';

    if (isOutputChain) {
      bestPath = path;
      break;
    }
    if (path.length > bestPath.length) bestPath = path;
  }

  // Filter out non-layer nodes (dataset, output) — these are the nn.Sequential indices
  return bestPath.filter((id) => {
    const bt = nodeMap.get(id)?.data?.blockType as string;
    return bt !== 'dataset' && bt !== 'output';
  });
}

// ─── Shape hint ───────────────────────────────────────────────────────────────

function getShapeHint(blockType: string, params: Record<string, any>): string {
  const p = (k: string) => params[k];
  switch (blockType) {
    case 'linear':          return `[B, ${p('in_features')}] → [B, ${p('out_features')}]`;
    case 'conv2d':          return `[B, ${p('in_channels')}, H, W] → [B, ${p('out_channels')}, H′, W′]`;
    case 'flatten':         return `[B, C, H, W] → [B, C×H×W]`;
    case 'batchnorm1d':     return `[B, ${p('num_features')}] → [B, ${p('num_features')}]`;
    case 'avgpool2d':       return `[B, C, H, W] → [B, C, H/${p('stride')}, W/${p('stride')}]`;
    case 'adaptiveavgpool2d': return `[B, C, H, W] → [B, C, ${p('output_size')}, ${p('output_size')}]`;
    case 'convtranspose2d': return `[B, ${p('in_channels')}, H, W] → [B, ${p('out_channels')}, H′, W′]`;
    case 'upsample':        return `[B, C, H, W] → [B, C, H×${p('scale_factor')}, W×${p('scale_factor')}]`;
    case 'layernorm':       return `[B, …, ${p('normalized_shape')}] → [B, …, ${p('normalized_shape')}]`;
    case 'embedding':       return `[B, seq] → [B, seq, ${p('embedding_dim')}]`;
    case 'rnn': case 'lstm': case 'gru':
                            return `[B, seq, ${p('input_size')}] → [B, seq, ${p('hidden_size')}]`;
    case 'positionalencoding': return `[B, seq, ${p('d_model')}] → [B, seq, ${p('d_model')}]`;
    case 'selfattention':   return `[B, seq, ${p('embed_dim')}] → [B, seq, ${p('embed_dim')}]`;
    case 'transformerencoderlayer': return `[B, seq, ${p('d_model')}] → [B, seq, ${p('d_model')}]`;
    case 'relu': case 'gelu': return `[B, …] → [B, …]  (unchanged)`;
    case 'softmax':         return `[B, classes] → [B, classes]  (sums to 1)`;
    case 'dataset':         return `→ [B, …]  (batch)`;
    case 'output':          return `[B, …] → output`;
    default:                return '—';
  }
}

// ─── Real weight heatmap ──────────────────────────────────────────────────────

function RealWeightHeatmap({ data }: { data: LayerWeightData }) {
  const { sample, rows, cols, stats } = data;

  // Normalise to [-1, 1] using percentile clamping so outliers don't wash out colours
  const sorted = [...sample].sort((a, b) => a - b);
  const p5  = sorted[Math.floor(sorted.length * 0.05)] ?? stats.min;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? stats.max;
  const range = Math.max(Math.abs(p5), Math.abs(p95), 1e-6);

  function cellColor(v: number): string {
    const norm = Math.max(-1, Math.min(1, v / range));
    if (norm > 0) {
      // positive → blue (#2563eb) at full intensity, white at 0
      const intensity = norm;
      const r = Math.round(255 - intensity * (255 - 37));
      const g = Math.round(255 - intensity * (255 - 99));
      const b = Math.round(255 - intensity * (255 - 235));
      return `rgb(${r},${g},${b})`;
    } else {
      // negative → red (#dc2626) at full intensity, white at 0
      const intensity = Math.abs(norm);
      const r = Math.round(255 - intensity * (255 - 220));
      const g = Math.round(255 - intensity * 255);
      const b = Math.round(255 - intensity * 255);
      return `rgb(${r},${g},${b})`;
    }
  }

  return (
    <div>
      {/* Shape label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-[#aaa] font-medium uppercase tracking-wide">Weight matrix sample</span>
        <code className="text-[10px] font-mono text-[#888] bg-[#f5f5f5] border border-[#e8e8e8] rounded px-1.5 py-0.5">
          [{data.shape.join(' × ')}]
        </code>
      </div>

      {/* Heatmap grid */}
      <div
        className="grid gap-[2px] rounded-lg overflow-hidden p-2 bg-[#f0f0f0] border border-[#e0e0e0]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {sample.slice(0, rows * cols).map((v, i) => (
          <div
            key={i}
            className="rounded-[2px]"
            style={{ height: '13px', backgroundColor: cellColor(v) }}
            title={v.toFixed(4)}
          />
        ))}
      </div>

      {/* Colour scale legend */}
      <div className="flex items-center justify-between mt-1.5 px-0.5">
        <span className="text-[9px] text-red-500 font-medium">{p5.toFixed(3)}</span>
        <div className="flex-1 mx-2 h-1.5 rounded-full"
          style={{ background: 'linear-gradient(to right, #dc2626, #ffffff, #2563eb)' }} />
        <span className="text-[9px] text-blue-500 font-medium">{p95.toFixed(3)}</span>
      </div>
    </div>
  );
}

// ─── Untrained placeholder heatmap ───────────────────────────────────────────

function PlaceholderHeatmap() {
  const ROWS = 12, COLS = 20;
  const cells = Array.from({ length: ROWS * COLS }, (_, i) => {
    const v = (((i * 2654435761) >>> 0) / 4294967296) * 2 - 1;
    return v;
  });
  return (
    <div className="relative">
      <div
        className="grid gap-[2px] rounded-lg overflow-hidden p-2 bg-[#f0f0f0] border border-[#e0e0e0]"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {cells.map((_, i) => (
          <div key={i} className="rounded-[2px] bg-[#e0e0e0]" style={{ height: '13px' }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[2px] rounded-lg">
        <Lock size={18} className="text-[#bbb] mb-1.5" />
        <p className="text-[11px] font-semibold text-[#999]">Train your model to see weights</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BlockInspectorProps {
  nodeId: string | null;
  onClose: () => void;
}

type Tab = 'about' | 'weights' | 'analysis';

export function BlockInspector({ nodeId, onClose }: BlockInspectorProps) {
  const nodes               = useStore((s) => s.nodes);
  const edges               = useStore((s) => s.edges);
  const lastTrainingResult  = useStore((s) => s.lastTrainingResult);
  const lastTrainedModelId  = useStore((s) => s.lastTrainedModelId);
  const setTutorPrefill     = useStore((s) => s.setTutorPrefill);
  const requestOpenTutorPanel = useStore((s) => s.requestOpenTutorPanel);

  const [activeTab, setActiveTab] = useState<Tab>('about');

  // Weight data state
  const [weightFetch, setWeightFetch] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'done'; layers: Record<string, LayerWeightData> }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  // Track which (modelId, nodeId) pair we last fetched for — avoid redundant calls
  const fetchedForRef = { modelId: '', nodeId: '' };

  // Reset when a new node is opened
  useEffect(() => {
    if (nodeId) {
      setActiveTab('about');
      setWeightFetch({ status: 'idle' });
    }
  }, [nodeId]);

  // Fetch weights lazily when the Weights tab is opened
  const fetchWeights = useCallback(async () => {
    if (!lastTrainedModelId) return;
    if (weightFetch.status === 'loading' || weightFetch.status === 'done') return;

    setWeightFetch({ status: 'loading' });
    try {
      const res = await getModelWeights(lastTrainedModelId);
      setWeightFetch({ status: 'done', layers: res.layers });
    } catch (err: any) {
      setWeightFetch({ status: 'error', message: err?.message ?? 'Failed to load weights' });
    }
  }, [lastTrainedModelId, weightFetch.status]);

  useEffect(() => {
    if (activeTab === 'weights' && lastTrainingResult !== null) {
      fetchWeights();
    }
  }, [activeTab, fetchWeights, lastTrainingResult]);

  if (!nodeId) return null;

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const blockType  = node.data.blockType as string;
  const params     = (node.data.params as Record<string, any>) || {};
  const definition = getBlockDefinition(blockType);
  if (!definition) return null;

  const color     = CATEGORY_COLORS[definition.category] || '#3b82f6';
  const snippet   = getPytorchSnippet(blockType, params);
  const thisCount = getParamCount(blockType, params);

  const totalCount = nodes.reduce((sum, n) => {
    const bt = n.data.blockType as string;
    const ps = (n.data.params as Record<string, any>) || {};
    return sum + getParamCount(bt, ps);
  }, 0);

  const pctOfModel = totalCount > 0 ? ((thisCount / totalCount) * 100).toFixed(1) : '0';
  const isTrained  = lastTrainingResult !== null;

  // Resolve sequential index of this node in the trained model
  const executionOrder = resolveExecutionOrder(nodes, edges);
  const layerIndex     = executionOrder.indexOf(nodeId);   // -1 if not found (dataset/output)

  // Get this layer's weight data from the fetched response
  const layerWeightData: LayerWeightData | null =
    weightFetch.status === 'done' && layerIndex >= 0
      ? (weightFetch.layers[String(layerIndex)] ?? null)
      : null;

  const handleAskTutor = () => {
    const paramSummary = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
    const msg = isTrained
      ? `Can you explain what my ${definition.title} layer is doing in my current architecture? It has ${paramSummary}. Based on my training results (accuracy: ${(lastTrainingResult!.accuracy! * 100).toFixed(1)}%, loss: ${lastTrainingResult!.loss?.toFixed(4)}), does it look healthy?`
      : `Can you explain what a ${definition.title} layer does and how I should configure it for my architecture? It currently has ${paramSummary}.`;
    setTutorPrefill(msg);
    requestOpenTutorPanel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[88vh] border border-[#e8e8e8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Colour accent bar ── */}
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: color }} />

        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 border-b border-[#ebebeb] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color }}>
                {CATEGORY_LABELS[definition.category] || definition.category.toUpperCase()}
              </span>
              <h2 className="text-[17px] font-bold text-[#111] leading-tight">{definition.title}</h2>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="font-mono text-[10px] bg-[#f5f5f5] border border-[#e8e8e8] rounded px-1.5 py-0.5 text-[#666]">
                  {getShapeHint(blockType, params)}
                </span>
                {thisCount > 0 ? (
                  <span className="text-[11px] text-[#666]">
                    <span className="font-semibold text-[#333]">{formatParamCount(thisCount)}</span> params
                    {totalCount > 0 && <span className="text-[10px] text-[#aaa] ml-1">({pctOfModel}%)</span>}
                  </span>
                ) : (
                  <span className="text-[11px] text-[#aaa]">No learnable parameters</span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-[#bbb] hover:text-[#555] hover:bg-[#f5f5f5] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex mt-3 border-b border-[#ebebeb] -mx-5 px-5">
            {(['about', 'weights', 'analysis'] as Tab[]).map((tab) => {
              const labels: Record<Tab, string>   = { about: 'About', weights: 'Weights', analysis: 'Analysis' };
              const icons:  Record<Tab, ReactNode> = {
                about:    <BookOpen  size={11} />,
                weights:  <BarChart2 size={11} />,
                analysis: <Zap       size={11} />,
              };
              const locked = tab === 'analysis' && !isTrained;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 pb-2 text-[11px] font-medium transition-colors border-b-2 -mb-[1px] ${
                    activeTab === tab
                      ? 'border-[#111] text-[#111]'
                      : 'border-transparent text-[#aaa] hover:text-[#555]'
                  }`}
                >
                  {icons[tab]}{labels[tab]}
                  {locked && <Lock size={9} className="text-[#ccc]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ ABOUT ══ */}
          {activeTab === 'about' && (
            <div className="px-5 py-4 space-y-5">
              {definition.description && (
                <p className="text-[13px] text-[#333] leading-relaxed">{definition.description}</p>
              )}

              {definition.whenToUse && (
                <div>
                  <h3 className="text-[11px] font-bold text-[#111] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Info size={11} style={{ color }} /> When to use
                  </h3>
                  <p className="text-[12px] text-[#555] leading-relaxed">{definition.whenToUse}</p>
                </div>
              )}

              {definition.commonMistakes && definition.commonMistakes.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-[#111] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-amber-500" /> Common mistakes
                  </h3>
                  <div className="space-y-1.5">
                    {definition.commonMistakes.map((m, i) => (
                      <div key={i} className="flex gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[11.5px] text-[#555] leading-relaxed">{m}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-[11px] font-bold text-[#111] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Code2 size={11} style={{ color }} /> PyTorch equivalent
                </h3>
                {definition.pytorchClass && (
                  <p className="text-[11px] text-[#888] mb-2">
                    Maps to{' '}
                    <code className="bg-[#f4f4f4] border border-[#e5e5e5] rounded px-1 font-mono text-[10px] text-[#444]">
                      {definition.pytorchClass}
                    </code>
                  </p>
                )}
                <pre className="bg-[#1a1a1a] text-[#e8e8e8] rounded-xl p-4 font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {snippet}
                </pre>
              </div>

              <div className="pt-1 border-t border-[#ebebeb]">
                <button
                  onClick={handleAskTutor}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-[#f5f5f5] hover:bg-[#eee] border border-[#e8e8e8] text-[12px] font-medium text-[#444] hover:text-[#111] transition-colors"
                >
                  <MessageSquare size={13} /> Ask Tutor About This Layer
                </button>
              </div>
            </div>
          )}

          {/* ══ WEIGHTS ══ */}
          {activeTab === 'weights' && (
            <div className="px-5 py-4 space-y-4">

              {/* Explainer */}
              <div className="bg-[#f8f8f8] border border-[#ebebeb] rounded-xl p-3.5">
                <h3 className="text-[11px] font-bold text-[#111] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Info size={11} className="text-[#aaa]" /> What am I looking at?
                </h3>
                <p className="text-[12px] text-[#555] leading-relaxed">
                  Weights are the numbers a neural network learns during training. Blue cells are positive (amplify the signal), red cells are negative (suppress it), and near-white cells are close to zero (little effect). The heatmap shows a sample slice of this layer's primary weight matrix.
                </p>
              </div>

              {/* No-params blocks */}
              {thisCount === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
                    <BarChart2 size={18} className="text-[#ccc]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#555]">{definition.title} has no learnable parameters</p>
                  <p className="text-[11px] text-[#aaa] mt-1 max-w-xs">
                    This block applies a fixed mathematical transformation — there are no weights to visualise.
                  </p>
                </div>
              )}

              {/* Blocks with params */}
              {thisCount > 0 && (
                <>
                  {/* Untrained */}
                  {!isTrained && <PlaceholderHeatmap />}

                  {/* Trained — loading */}
                  {isTrained && weightFetch.status === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <Loader2 size={22} className="animate-spin text-[#aaa]" />
                      <p className="text-[12px] text-[#aaa]">Loading weights from model…</p>
                    </div>
                  )}

                  {/* Trained — error */}
                  {isTrained && weightFetch.status === 'error' && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[12px] font-semibold text-red-700 mb-0.5">Failed to load weights</p>
                        <p className="text-[11px] text-red-600">{weightFetch.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Trained — no data for this layer (no learnable params in state_dict) */}
                  {isTrained && weightFetch.status === 'done' && !layerWeightData && (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                      <BarChart2 size={20} className="text-[#ccc]" />
                      <p className="text-[12px] text-[#888]">No weight data found for this layer at index {layerIndex}.</p>
                      <p className="text-[11px] text-[#aaa]">This layer may have no learnable parameters in the saved model.</p>
                    </div>
                  )}

                  {/* Trained — real heatmap */}
                  {isTrained && weightFetch.status === 'done' && layerWeightData && (
                    <RealWeightHeatmap data={layerWeightData} />
                  )}

                  {/* Stats cards — always shown when params > 0 */}
                  {(weightFetch.status === 'idle' || weightFetch.status === 'loading' || !isTrained || weightFetch.status === 'done') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#fafafa] border border-[#ebebeb] rounded-xl p-3">
                        <p className="text-[10px] text-[#aaa] uppercase tracking-wide mb-0.5">Parameters</p>
                        <p className="text-[14px] font-semibold text-[#111]">{formatParamCount(thisCount)}</p>
                      </div>
                      <div className="bg-[#fafafa] border border-[#ebebeb] rounded-xl p-3">
                        <p className="text-[10px] text-[#aaa] uppercase tracking-wide mb-0.5">% of Model</p>
                        <p className="text-[14px] font-semibold text-[#111]">{pctOfModel}%</p>
                      </div>
                      <div className={`border rounded-xl p-3 ${isTrained && layerWeightData ? 'bg-[#fafafa] border-[#ebebeb]' : 'bg-[#fafafa] border-[#ebebeb]'}`}>
                        <p className="text-[10px] text-[#aaa] uppercase tracking-wide mb-0.5">Mean weight</p>
                        <p className="text-[14px] font-semibold text-[#111]">
                          {layerWeightData ? layerWeightData.stats.mean.toFixed(4) : '—'}
                        </p>
                      </div>
                      <div className={`border rounded-xl p-3 ${isTrained && layerWeightData ? 'bg-emerald-50 border-emerald-200' : 'bg-[#fafafa] border-[#ebebeb]'}`}>
                        <p className="text-[10px] text-[#aaa] uppercase tracking-wide mb-0.5">Status</p>
                        <p className={`text-[14px] font-semibold ${isTrained && layerWeightData ? 'text-emerald-700' : 'text-[#111]'}`}>
                          {isTrained && layerWeightData ? 'Trained ✓' : isTrained ? 'Loading…' : 'Random init'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Extended stats when available */}
                  {layerWeightData && (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Min',  value: layerWeightData.stats.min.toFixed(4) },
                        { label: 'Max',  value: layerWeightData.stats.max.toFixed(4) },
                        { label: 'Mean', value: layerWeightData.stats.mean.toFixed(4) },
                        { label: 'Std',  value: layerWeightData.stats.std.toFixed(4) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-[#fafafa] border border-[#ebebeb] rounded-xl p-2.5 text-center">
                          <p className="text-[9px] text-[#bbb] uppercase tracking-wide mb-0.5">{label}</p>
                          <p className="text-[12px] font-mono font-semibold text-[#333]">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dead-weight warning */}
                  {layerWeightData && Math.abs(layerWeightData.stats.mean) < 0.001 && layerWeightData.stats.std < 0.01 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11.5px] text-amber-700">
                        <span className="font-semibold">Possible dead weights</span> — mean and std are both very small. This layer may not have learned much. Consider a higher learning rate or more epochs.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ ANALYSIS ══ */}
          {activeTab === 'analysis' && (
            <div className="px-5 py-4 space-y-3">
              {!isTrained ? (
                <div className="space-y-3">
                  {[
                    { icon: <Zap size={14} />,         title: 'Gradient health',    desc: 'Whether gradients flowing through this layer are healthy, vanishing, or exploding.' },
                    { icon: <BarChart2 size={14} />,   title: 'Activation pattern', desc: 'What the activation values look like — are neurons active, saturated, or dead?' },
                    { icon: <MessageSquare size={14} />, title: 'Suggestions',       desc: 'Specific, actionable improvements based on this layer\'s position and training results.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="relative border border-[#ebebeb] rounded-xl p-4 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1.5 opacity-30">
                        <span className="text-[#aaa]">{icon}</span>
                        <h4 className="text-[12px] font-semibold text-[#333]">{title}</h4>
                      </div>
                      <p className="text-[11px] text-[#aaa] opacity-60">{desc}</p>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                        <div className="flex items-center gap-1.5 bg-white border border-[#e0e0e0] rounded-full px-3 py-1.5 shadow-sm">
                          <Lock size={11} className="text-[#bbb]" />
                          <span className="text-[10.5px] font-medium text-[#999]">Train your model to unlock</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Gradient health — derived from weight stats if available */}
                  <div className={`border rounded-xl p-4 ${layerWeightData && layerWeightData.stats.std > 0.001 ? 'bg-emerald-50 border-emerald-200' : 'bg-[#f8f8f8] border-[#ebebeb]'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap size={13} className={layerWeightData && layerWeightData.stats.std > 0.001 ? 'text-emerald-600' : 'text-[#888]'} />
                      <h4 className={`text-[12px] font-semibold ${layerWeightData && layerWeightData.stats.std > 0.001 ? 'text-emerald-800' : 'text-[#333]'}`}>Gradient health</h4>
                    </div>
                    <p className={`text-[11.5px] leading-relaxed ${layerWeightData && layerWeightData.stats.std > 0.001 ? 'text-emerald-700' : 'text-[#555]'}`}>
                      {layerWeightData
                        ? layerWeightData.stats.std > 0.05
                          ? `Weight std dev is ${layerWeightData.stats.std.toFixed(4)} — gradients appear to be flowing well through this layer.`
                          : layerWeightData.stats.std > 0.001
                          ? `Weight std dev is ${layerWeightData.stats.std.toFixed(4)} — gradients are flowing but weights are tightly clustered. This is typical after few epochs.`
                          : `Weight std dev is very small (${layerWeightData.stats.std.toFixed(4)}) — this layer may have vanishing gradients. Try a higher learning rate.`
                        : `Model trained (loss: ${lastTrainingResult!.loss?.toFixed(4)}, accuracy: ${(lastTrainingResult!.accuracy! * 100).toFixed(1)}%). Open the Weights tab first to load per-layer stats.`
                      }
                    </p>
                  </div>

                  {/* Activation pattern */}
                  <div className="bg-[#f8f8f8] border border-[#ebebeb] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <BarChart2 size={13} className="text-[#666]" />
                      <h4 className="text-[12px] font-semibold text-[#333]">Activation pattern</h4>
                    </div>
                    <p className="text-[11.5px] text-[#555] leading-relaxed">
                      {thisCount === 0
                        ? `${definition.title} applies a fixed transformation — activations depend entirely on the upstream layer.`
                        : layerWeightData
                        ? `Weight range [${layerWeightData.stats.min.toFixed(3)}, ${layerWeightData.stats.max.toFixed(3)}] with mean ${layerWeightData.stats.mean.toFixed(4)}. ${
                            Math.abs(layerWeightData.stats.mean) > 0.1
                              ? 'Mean weight is notably offset from zero — the layer has developed a directional bias.'
                              : 'Mean is near zero, indicating balanced positive/negative activations — healthy for most layers.'
                          }`
                        : `This ${definition.title} layer has ${formatParamCount(thisCount)} parameters (${pctOfModel}% of model). Open the Weights tab to load detailed stats.`
                      }
                    </p>
                  </div>

                  {/* Suggestions */}
                  <div className="bg-[#f0f4ff] border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MessageSquare size={13} className="text-blue-600" />
                      <h4 className="text-[12px] font-semibold text-blue-800">Suggestions</h4>
                    </div>
                    <p className="text-[11.5px] text-blue-700 leading-relaxed">
                      {(lastTrainingResult!.accuracy ?? 0) < 0.80
                        ? `Accuracy is below 80% (${((lastTrainingResult!.accuracy ?? 0) * 100).toFixed(1)}%). Consider tuning this ${definition.title} block — ${
                            blockType === 'linear' ? `try increasing out_features to give the model more capacity` :
                            blockType === 'conv2d' ? `try more out_channels or an additional Conv2d layer` :
                            `check the learning rate and number of epochs`
                          }. Use the Ask Tutor button for specific advice.`
                        : `Good results (${((lastTrainingResult!.accuracy ?? 0) * 100).toFixed(1)}% accuracy). This layer appears to be contributing effectively to the model.`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-[#ebebeb] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-[#f5f5f5] hover:bg-[#eee] text-[12px] font-medium text-[#555] hover:text-[#111] border border-[#e8e8e8] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
