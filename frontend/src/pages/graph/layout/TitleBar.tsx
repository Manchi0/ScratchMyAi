import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { saveGraph } from "@/lib/graphFunctions";
import { TrainingConsole } from "@/pages/graph/training/TrainingConsole";
import { TrainButton } from "@/pages/graph/training/TrainButton";

export function TitleBar() {
  const {
    graphId: workflowId,
    setGraphId: setWorkflowId,
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
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [graphDataForTraining, setGraphDataForTraining] = useState<any>(null);

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

  const handleTrainClick = async () => {
    // Generate graphData right before opening modal
    const { serializeGraph } = await import('@/lib/serializeGraph');
    setGraphDataForTraining(serializeGraph(nodes, edges, trainingConfig));
    setIsTrainingModalOpen(true);
  };

  const handleExport = () => {
    import('@/lib/serializeGraph').then(({ serializeGraph }) => {
      const graphData = serializeGraph(nodes, edges, trainingConfig);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graphData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', `${title.replace(/\s+/g, '_')}_graph.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  };

  return (
    <>
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-stone-100 text-[#57534e] hover:bg-stone-200 px-4 py-1.5 shadow-sm"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>

          <TrainButton
            showConfig={showConfig}
            setShowConfig={setShowConfig}
            trainingConfig={trainingConfig}
            setTrainingConfig={setTrainingConfig}
            onTrain={handleTrainClick}
            onExport={handleExport}
          />
        </div>
      </header>

      {/* Render Modal conditionally, only when open, to ensure it mounts properly */}
      {isTrainingModalOpen && graphDataForTraining && (
        <TrainingConsole 
          isOpen={isTrainingModalOpen} 
          onClose={() => setIsTrainingModalOpen(false)} 
          graphData={graphDataForTraining} 
          title={title}
        />
      )}
    </>
  );
}
