import { type GraphSummary } from '@/lib/graphFunctions';
import { GraphCard } from './GraphCard';

interface GraphsTabProps {
  graphs: GraphSummary[];
  onDeleteGraph: (id: string) => Promise<void>;
}

export function GraphsTab({ graphs, onDeleteGraph }: GraphsTabProps) {
  const courseGraphs = graphs.filter(g => g.course_id);
  const personalGraphs = graphs.filter(g => !g.course_id);

  if (graphs.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <p className="text-neutral-500 text-lg">No saved graphs yet.</p>
        <p className="text-neutral-400 text-sm mt-1">Start by clicking "+ New Graph".</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {personalGraphs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#111] mb-4">Personal Graphs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personalGraphs.map((w) => (
              <GraphCard
                key={w.id}
                id={w.id}
                title={w.title}
                updatedAt={w.updated_at}
                nodes={w.nodes}
                edges={w.edges}
                onDelete={onDeleteGraph}
              />
            ))}
          </div>
        </div>
      )}

      {courseGraphs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[#111] mb-4">Course Graphs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courseGraphs.map((w) => (
              <GraphCard
                key={w.id}
                id={w.id}
                title={w.title}
                updatedAt={w.updated_at}
                nodes={w.nodes}
                edges={w.edges}
                onDelete={onDeleteGraph}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
