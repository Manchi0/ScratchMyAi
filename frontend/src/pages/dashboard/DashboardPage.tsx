import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { listGraphs, deleteGraph, type GraphSummary } from '@/lib/graphFunctions';
import { listTrainedModels, predictModel, deleteTrainedModel, type TrainedModelSummary } from '@/lib/modelFunctions';
import { Brain, Network, GraduationCap } from 'lucide-react';
import { GraphsTab } from './GraphsTab';
import { InferenceTab } from './inference/InferenceTab';
import { LearnTab } from './LearnTab';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'graphs' | 'inference' | 'learn'>('graphs');
  
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [trainedModels, setTrainedModels] = useState<TrainedModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<TrainedModelSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    Promise.all([
      listGraphs(user.id).then(setGraphs),
      listTrainedModels(user.id).then(setTrainedModels)
    ])
    .catch((err) => console.error('Failed to load dashboard data:', err))
    .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'inference') setActiveTab('inference');
    if (requestedTab === 'learn') setActiveTab('learn');

    const requestedModelId = searchParams.get('model');
    if (requestedModelId && trainedModels.length > 0) {
      const matchedModel = trainedModels.find((m) => m.id === requestedModelId);
      if (matchedModel) {
        setActiveTab('inference');
        setSelectedModel(matchedModel);
      }
    }
  }, [searchParams, trainedModels]);

  const handleDeleteGraph = async (id: string) => {
    try {
      await deleteGraph(id);
      setGraphs((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Failed to delete graph:', err);
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      await deleteTrainedModel(id);
      setTrainedModels((prev) => prev.filter((m) => m.id !== id));
      if (selectedModel?.id === id) {
        setSelectedModel(null);
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const handlePredict = async (batch: any[]) => {
      if (!selectedModel) throw new Error("No model selected.");
      return await predictModel(selectedModel.id, batch);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-800">Scratch My AI</h1>
          <button
            onClick={() => navigate('/graph')}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + New Graph
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-stone-200">
            <button 
                onClick={() => setActiveTab('graphs')}
                className={`flex items-center gap-2 px-4 py-3 -mb-px font-medium border-b-2 transition-colors ${activeTab === 'graphs' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}
            >
                <Network size={18} />
                My Graphs
            </button>
            <button
                onClick={() => setActiveTab('inference')}
                className={`flex items-center gap-2 px-4 py-3 -mb-px font-medium border-b-2 transition-colors ${activeTab === 'inference' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}
            >
                <Brain size={18} />
                Inference Models
            </button>
            <button
                onClick={() => setActiveTab('learn')}
                className={`flex items-center gap-2 px-4 py-3 -mb-px font-medium border-b-2 transition-colors ${activeTab === 'learn' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}
            >
                <GraduationCap size={18} />
                Learning ML
            </button>
        </div>

        {activeTab === 'learn' ? (
          <LearnTab />
        ) : loading ? (
          <p className="text-neutral-500">Loading your AI projects…</p>
        ) : activeTab === 'graphs' ? (
          <GraphsTab graphs={graphs} onDeleteGraph={handleDeleteGraph} />
        ) : (
          <InferenceTab
            trainedModels={trainedModels}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onDeleteModel={handleDeleteModel}
            onPredict={handlePredict}
          />
        )}
      </div>
    </div>
  );
}
