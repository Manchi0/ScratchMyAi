import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { listGraphs, deleteGraph, type GraphSummary } from '@/lib/graphFunctions';
import { listTrainedModels, predictModel, deleteTrainedModel, type TrainedModelSummary } from '@/lib/modelFunctions';
import { Brain, Network, GraduationCap } from 'lucide-react';
import { Spinner, Button } from '@heroui/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#faf9f5]">
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-start mb-8 border-b border-[#e8e7e2] pb-6">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-3xl font-semibold text-[#111] tracking-tight">
                  {activeTab === 'graphs' && 'My Graphs'}
                  {activeTab === 'inference' && 'Inference Models'}
                  {activeTab === 'learn' && 'Learning ML'}
                </h1>
                <p className="text-[14px] text-[#666] font-medium">
                  {activeTab === 'graphs' && 'Design, train, and manage your visual neural networks and graph architectures.'}
                  {activeTab === 'inference' && 'Evaluate and run predictions using your previously trained machine learning models.'}
                  {activeTab === 'learn' && 'Learn deep learning fundamentals through step-by-step, interactive block tutorials.'}
                </p>
              </div>
              {activeTab === 'graphs' && (
                <Button
                  variant="primary"
                  onPress={() => navigate('/graph')}
                >
                  + New Graph
                </Button>
              )}
            </div>

            {activeTab === 'learn' ? (
              <LearnTab />
            ) : loading ? (
              <div className="flex items-center gap-2 text-[13px] text-[#555] bg-white border border-[#e8e8e8] w-fit px-4 py-2 rounded-lg">
                <Spinner size="sm" className="text-[#999]" />
                <span>Loading your AI projects…</span>
              </div>
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
        </main>
      </div>
    </SidebarProvider>
  );
}
