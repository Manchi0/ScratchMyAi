import { Play } from 'lucide-react';
import { DrawCanvas } from './DrawCanvas';
import { InferenceModelCard } from './InferenceModelCard';
import { type TrainedModelSummary } from '@/lib/modelFunctions';

interface InferenceTabProps {
  trainedModels: TrainedModelSummary[];
  selectedModel: TrainedModelSummary | null;
  onSelectModel: (model: TrainedModelSummary) => void;
  onDeleteModel: (id: string) => void;
  onPredict: (batch: any[]) => Promise<any[]>;
}

export function InferenceTab({ 
  trainedModels, 
  selectedModel, 
  onSelectModel, 
  onDeleteModel,
  onPredict 
}: InferenceTabProps) {
  if (trainedModels.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <p className="text-neutral-500 text-lg">No models have finished training yet.</p>
        <p className="text-neutral-400 text-sm mt-1">Create a graph and click "Train" to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Sidebar list of models */}
      <div className="w-1/3 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest pl-1 mb-1">Select a Model</h3>
        {trainedModels.map((m) => (
          <InferenceModelCard 
            key={m.id}
            model={m}
            isSelected={selectedModel?.id === m.id}
            onSelect={onSelectModel}
            onDelete={onDeleteModel}
          />
        ))}
      </div>
      
      {/* Interactive Canvas pane */}
      <div className="w-2/3">
        {!selectedModel ? (
          <div className="h-full flex items-center justify-center p-12 bg-stone-100 rounded-2xl border-2 border-dashed border-stone-300">
            <p className="text-stone-500 font-medium text-center">Select a model from the left<br/>to start inferencing!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DrawCanvas onPredict={onPredict} dataset={selectedModel.dataset} />
          </div>
        )}
      </div>
    </div>
  );
}
