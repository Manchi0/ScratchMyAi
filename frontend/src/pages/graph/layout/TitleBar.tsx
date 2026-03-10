import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, ChevronDown } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { saveGraph } from "@/lib/graphFunctions";

export function TitleBar() {
  const {
    workflowId,
    setWorkflowId,
    title,
    setTitle,
    nodes,
    edges,
    trainingConfig,
    setTrainingConfig
  } = useStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);

    try {
      const id = await saveGraph(user.id, {
        id: workflowId,
        title,
        nodes,
        edges,
        trainingConfig,
      });
      setWorkflowId(id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save graph:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="flex items-center justify-between h-12 px-2.5 border-b border-[#e8e7e2] bg-white shrink-0">
      <div className="w-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          title="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex items-center h-8 px-1 rounded-md hover:bg-[#f8f7f4] transition-colors group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm font-medium text-[#57534e] bg-transparent border-none outline-none focus:text-[#1c1917] w-64 px-1 text-center"
          placeholder="Untitled"
          spellCheck={false}
        />
      </div>

      <div className="w-auto flex justify-end gap-2 relative">
        {/* Training Config Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none px-3 py-1.5 shadow-sm ${showConfig
              ? "bg-stone-200 text-stone-900"
              : "bg-stone-100 text-[#57534e] hover:bg-stone-200"
              }`}
          >
            <Settings size={14} />
            <span>Training config</span>
            <ChevronDown size={14} className={`transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {showConfig && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 p-4 z-50 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xs font-semibold text-stone-900 mb-3 uppercase tracking-wider">Training Parameters</h3>

              <div className="space-y-4">
                {/* Loss */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-stone-500">Loss Function</label>
                  <select
                    value={trainingConfig.loss}
                    onChange={(e) => setTrainingConfig({ loss: e.target.value })}
                    className="w-full text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    <option value="CrossEntropy">CrossEntropy</option>
                    <option value="MSELoss">MSELoss</option>
                    <option value="L1Loss">L1Loss</option>
                    <option value="NLLLoss">NLLLoss</option>
                  </select>
                </div>

                {/* Optimizer */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-stone-500">Optimizer</label>
                  <select
                    value={trainingConfig.optimizer}
                    onChange={(e) => setTrainingConfig({ optimizer: e.target.value })}
                    className="w-full text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    <option value="Adam">Adam</option>
                    <option value="SGD">SGD</option>
                    <option value="RMSprop">RMSprop</option>
                    <option value="Adagrad">Adagrad</option>
                  </select>
                </div>

                {/* Learning Rate & Epochs Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-stone-500">Learning Rate</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={trainingConfig.learning_rate}
                      onChange={(e) => setTrainingConfig({ learning_rate: parseFloat(e.target.value) })}
                      className="w-full text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-stone-500">Epochs</label>
                    <input
                      type="number"
                      value={trainingConfig.epochs}
                      onChange={(e) => setTrainingConfig({ epochs: parseInt(e.target.value) })}
                      className="w-full text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-1 focus:ring-stone-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-stone-100 text-[#57534e] hover:bg-stone-200 px-4 py-1.5 shadow-sm"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
        <button
          onClick={() => {
            import('@/lib/serializeGraph').then(({ serializeGraph }) => {
              const graphData = serializeGraph(nodes, edges, trainingConfig);
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graphData, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute('href', dataStr);
              downloadAnchorNode.setAttribute('download', 'model_architecture.json');
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            });
          }}
          className="whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none bg-stone-100 text-[#57534e] hover:bg-stone-200 px-4 py-1.5 shadow-sm"
        >
          Export JSON
        </button>
        <button
          onClick={() => {
            console.log("Train button clicked - API integration pending");
            import('@/lib/serializeGraph').then(({ serializeGraph }) => {
              console.log("Current Training Config:", trainingConfig);
              console.log("Serialized Graph:", serializeGraph(nodes, edges, trainingConfig));
            });
          }}
          className="whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-1.5 shadow-sm"
        >
          Train
        </button>
      </div>
    </header>
  );
}
