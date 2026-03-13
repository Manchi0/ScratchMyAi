import { Settings, ChevronDown } from "lucide-react";

interface TrainingConfig {
  loss: string;
  optimizer: string;
  learning_rate: number;
  epochs: number;
}

interface TrainButtonProps {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  trainingConfig: TrainingConfig;
  setTrainingConfig: (config: Partial<TrainingConfig>) => void;
  onTrain: () => void;
  onExport: () => void;
}

export function TrainButton({
  showConfig,
  setShowConfig,
  trainingConfig,
  setTrainingConfig,
  onTrain,
  onExport,
}: TrainButtonProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowConfig(!showConfig)}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none px-4 py-1.5 shadow-sm ${
          showConfig
            ? "bg-stone-800 text-white"
            : "bg-neutral-900 text-white hover:bg-neutral-800"
        }`}
      >
        <span>Train</span>
        <ChevronDown size={14} className={`transition-transform ${showConfig ? 'rotate-180' : ''}`} />
      </button>

      {showConfig && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-stone-200 p-5 z-50 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest text-center">Training Config</h3>
            <Settings size={14} className="text-stone-400" />
          </div>

          <div className="space-y-4">
            {/* Loss */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter">Loss Function</label>
              <select
                value={trainingConfig.loss}
                onChange={(e) => setTrainingConfig({ loss: e.target.value })}
                className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-2 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="CrossEntropy">CrossEntropy (Classification)</option>
                <option value="MSELoss">MSELoss (Regression)</option>
                <option value="L1Loss">L1Loss</option>
                <option value="NLLLoss">NLLLoss</option>
              </select>
            </div>

            {/* Optimizer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter">Optimizer</label>
              <select
                value={trainingConfig.optimizer}
                onChange={(e) => setTrainingConfig({ optimizer: e.target.value })}
                className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-2 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Adam">Adam (Recommended)</option>
                <option value="SGD">SGD</option>
                <option value="RMSprop">RMSprop</option>
                <option value="Adagrad">Adagrad</option>
              </select>
            </div>

            {/* Learning Rate & Epochs Grid */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter">Learn Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={trainingConfig.learning_rate}
                  onChange={(e) => setTrainingConfig({ learning_rate: parseFloat(e.target.value) })}
                  className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-2 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter">Epochs</label>
                <input
                  type="number"
                  value={trainingConfig.epochs}
                  onChange={(e) => setTrainingConfig({ epochs: parseInt(e.target.value) })}
                  className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-2 bg-stone-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowConfig(false);
                  onTrain();
                }}
                className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Start Training
              </button>
              <button
                onClick={onExport}
                className="w-full bg-white text-stone-600 border border-stone-200 rounded-lg py-2 text-xs font-medium hover:bg-stone-50 transition-colors"
              >
                Export JSON Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
