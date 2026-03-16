import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { listGraphs, deleteGraph, type GraphSummary } from '@/lib/graphFunctions';
import { listTrainedModels, predictModel, deleteTrainedModel, type TrainedModelSummary } from '@/lib/modelFunctions';
import { Brain, LogOut, Network } from 'lucide-react';
import { GraphsTab } from './GraphsTab';
import { InferenceTab } from './inference/InferenceTab';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [activeTab, setActiveTab] = useState<'graphs' | 'inference'>('graphs');
  
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [trainedModels, setTrainedModels] = useState<TrainedModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<TrainedModelSummary | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    if (requestedTab === 'inference') {
      setActiveTab('inference');
    }

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

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Failed to sign out:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-neutral-800">Scratch My AI</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 bg-white text-stone-700 font-medium rounded-lg hover:bg-stone-100 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogOut size={16} />
              {isSigningOut ? 'Logging out...' : 'Logout'}
            </button>
            <button
              onClick={() => navigate('/graph')}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              + New Graph
            </button>
          </div>
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
        </div>

        {loading ? (
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
