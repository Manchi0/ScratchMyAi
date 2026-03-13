import { type TrainedModelSummary } from '@/lib/modelFunctions';
import { Trash2 } from 'lucide-react';

interface InferenceModelCardProps {
  model: TrainedModelSummary;
  isSelected: boolean;
  onSelect: (model: TrainedModelSummary) => void;
  onDelete: (id: string) => void;
}

export function InferenceModelCard({ model, isSelected, onSelect, onDelete }: InferenceModelCardProps) {
  return (
    <div 
      onClick={() => onSelect(model)}
      className={`relative group p-4 rounded-xl cursor-pointer transition-all border ${
        isSelected 
          ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500' 
          : 'border-stone-200 bg-white hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(model.id);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete model"
      >
        <Trash2 size={16} />
      </button>

      <div className="flex justify-between items-start mb-1 pr-8">
        <h4 className="font-semibold text-stone-900">{model.name || "Untitled Model"}</h4>
      </div>
      {/* Mocking accuracy purely for UX if missing from db directly */}
      <p className="text-xs text-stone-500 flex items-center justify-between">
        <span>Accuracy: {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : '00.0%'}</span>
        <span>{new Date(model.created_at).toLocaleDateString()}</span>
      </p>
    </div>
  );
}
