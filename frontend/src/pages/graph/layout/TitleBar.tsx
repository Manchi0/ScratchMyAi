import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@heroui/react/button";
import { Input } from "@heroui/react/input";
import { Spinner } from "@heroui/react/spinner";
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
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            isIconOnly
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </Button>
        </div>

        <div className="flex items-center h-8 px-1">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="primary"
            className="font-semibold w-64 text-[14px] text-center shadow-none text-stone-700"
            placeholder="Untitled"
            spellCheck={false}
          />
        </div>

        <div className="w-auto flex justify-end gap-2 relative">
          <Button
            onPress={handleSave}
            isDisabled={saving}
            isPending={saving}
            variant="tertiary"
          >
            {({ isPending }) => (
              <div className="flex items-center gap-1.5">
                {isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  <Save size={16} />
                )}
                <span>Save</span>
              </div>
            )}
          </Button>

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
