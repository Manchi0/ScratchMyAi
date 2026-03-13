import { type GraphSummary } from '@/lib/graphFunctions';
import { GraphCard } from './GraphCard';

interface GraphsTabProps {
  graphs: GraphSummary[];
  onDeleteGraph: (id: string) => Promise<void>;
}

export function GraphsTab({ graphs, onDeleteGraph }: GraphsTabProps) {
  if (graphs.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <p className="text-neutral-500 text-lg">No saved graphs yet.</p>
        <p className="text-neutral-400 text-sm mt-1">Start by clicking "+ New Graph".</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {graphs.map((w) => (
        <GraphCard
          key={w.id}
          id={w.id}
          title={w.title}
          updatedAt={w.updated_at}
          onDelete={onDeleteGraph}
        />
      ))}
    </div>
  );
}
