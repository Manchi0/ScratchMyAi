import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelCard } from './ModelCard';
import { useAuthStore } from '@/store/useAuthStore';
import { listGraphs, deleteGraph, type GraphSummary } from '@/lib/graphFunctions';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [workflows, setWorkflows] = useState<GraphSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listGraphs(user.id)
      .then(setWorkflows)
      .catch((err) => console.error('Failed to load graphs:', err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      await deleteGraph(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Failed to delete graph:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold text-neutral-800">Your Models</h1>
          <button
            onClick={() => navigate('/graph')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Model
          </button>
        </div>

        {loading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : workflows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-400 text-lg">No models yet.</p>
            <p className="text-neutral-400 text-sm mt-1">Click "+ New Model" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {workflows.map((w) => (
              <ModelCard
                key={w.id}
                id={w.id}
                title={w.title}
                updatedAt={w.updated_at}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
