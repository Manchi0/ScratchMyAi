import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileJson, Save } from "lucide-react";
import { Button } from "@heroui/react/button";
import { Input } from "@heroui/react/input";
import { Spinner } from "@heroui/react/spinner";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { saveGraph } from "@/lib/graphFunctions";
import { supabase } from "@/lib/supabase";
import { TrainingConsole } from "@/pages/graph/training/TrainingConsole";
import { TrainButton } from "@/pages/graph/training/TrainButton";
import { validateGraphStructure } from "@/lib/connectionValidator";
import { toast } from "@heroui/react";

function PythonLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" role="img" aria-label="Python logo">
      <path
        fill="#3776ab"
        d="M63.9 8c-28.1 0-26.4 12.2-26.4 12.2v12.6h26.8v3.8H26.8S8 34.5 8 62.9c0 28.4 16.5 27.4 16.5 27.4h9.9V76.5s-.5-16.5 16.2-16.5h27.1s15.2.2 15.2-14.7V20.9S95.2 8 63.9 8Zm-14.7 8.4a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"
      />
      <path
        fill="#ffd343"
        d="M64.1 120c28.1 0 26.4-12.2 26.4-12.2V95.2H63.7v-3.8h37.5s18.8 2.1 18.8-26.3c0-28.4-16.5-27.4-16.5-27.4h-9.9v13.8s.5 16.5-16.2 16.5H50.3s-15.2-.2-15.2 14.7v24.4S32.8 120 64.1 120Zm14.7-8.4a4.8 4.8 0 1 1 0-9.6 4.8 4.8 0 0 1 0 9.6Z"
      />
    </svg>
  );
}

export function TitleBar() {
  const {
    graphId: workflowId,
    setGraphId: setWorkflowId,
    title,
    setTitle,
    nodes,
    edges,
    trainingConfig,
    setTrainingConfig,
    courseId
  } = useStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const validation = {
    structuralIssues: validateGraphStructure(nodes, edges),
    edgeErrorCount: edges.filter((e) => e.data?.validationSeverity === 'error').length,
    edgeWarningCount: edges.filter((e) => e.data?.validationSeverity === 'warning').length,
  };

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
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
        courseId,
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

  const handleSetShowConfig = (show: boolean) => {
    if (show) {
      setShowExportMenu(false);
    }
    setShowConfig(show);
  };

  const handleExport = () => {
    setShowExportMenu(false);
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

  const handleExportPython = async () => {
    try {
      setShowExportMenu(false);
      const { serializeGraph } = await import('@/lib/serializeGraph');
      const graphData = serializeGraph(nodes, edges, trainingConfig);
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('http://localhost:8000/models/export/python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          graph_json: graphData,
          dataset: graphData.dataset,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const payload = await response.json();
      const code = String(payload?.code || '');
      if (!code.trim()) {
        throw new Error('Backend returned an empty script');
      }

      const safeTitle = (title || 'untitled')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '') || 'untitled';

      const blob = new Blob([code], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', url);
      downloadAnchorNode.setAttribute('download', `${safeTitle}_train.py`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export python code';
      toast.danger('Export to Python failed', { description: message });
    }
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
            className="font-semibold w-[450px] text-[14px] text-center shadow-none text-stone-700"
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
            setShowConfig={handleSetShowConfig}
            trainingConfig={trainingConfig}
            setTrainingConfig={setTrainingConfig}
            onTrain={handleTrainClick}
            validation={validation}
          />

          <div className="relative">
            <Button
              onPress={() => {
                setShowConfig(false);
                setShowExportMenu((prev) => !prev);
              }}
              variant="outline"
              aria-label="Export options"
            >
              <div className="flex items-center gap-1.5">
                <span>Export</span>
                <Download size={15} />
              </div>
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-stone-200 p-2 z-50 animate-in fade-in zoom-in duration-200">
                <Button onPress={handleExport} variant="ghost" fullWidth>
                  <div className="w-full flex items-center justify-between">
                    <span className="text-sm">Export JSON</span>
                    <FileJson size={16} />
                  </div>
                </Button>
                <Button onPress={handleExportPython} variant="ghost" fullWidth>
                  <div className="w-full flex items-center justify-between">
                    <span className="text-sm">Export Python</span>
                    <PythonLogo size={16} />
                  </div>
                </Button>
              </div>
            )}
          </div>
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
