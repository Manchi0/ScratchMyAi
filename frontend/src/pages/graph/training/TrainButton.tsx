import { Settings } from "lucide-react";
import { Button } from "@heroui/react/button";
import { Select } from "@heroui/react/select";
import { Input } from "@heroui/react/input";
import { ListBox } from "@heroui/react/list-box";
import { toast } from "@heroui/react";
import type { StructuralIssue } from "@/lib/connectionValidator";

interface TrainingConfig {
  loss: string;
  optimizer: string;
  learning_rate: number;
  epochs: number;
}

export interface ValidationSummary {
  structuralIssues: StructuralIssue[];
  edgeErrorCount: number;
  edgeWarningCount: number;
}

interface TrainButtonProps {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  trainingConfig: TrainingConfig;
  setTrainingConfig: (config: Partial<TrainingConfig>) => void;
  onTrain: () => void;
  validation: ValidationSummary;
}

export function TrainButton({
  showConfig,
  setShowConfig,
  trainingConfig,
  setTrainingConfig,
  onTrain,
  validation,
}: TrainButtonProps) {
  const hardErrors = validation.structuralIssues.filter((i) => i.severity === 'error');
  const warnings = validation.structuralIssues.filter((i) => i.severity === 'warning');
  const hasBlockingErrors = hardErrors.length > 0 || validation.edgeErrorCount > 0;
  const hasWarningsOnly =
    !hasBlockingErrors && (warnings.length > 0 || validation.edgeWarningCount > 0);

  const buildErrorDescription = () => {
    const lines: string[] = [
      ...hardErrors.map((i) => i.message),
      ...(validation.edgeErrorCount > 0
        ? [`${validation.edgeErrorCount} invalid connection${validation.edgeErrorCount > 1 ? 's' : ''} in the graph (shown in red).`]
        : []),
    ];
    return lines.join('\n');
  };

  const buildWarningDescription = () => {
    const lines: string[] = [
      ...warnings.map((i) => i.message),
      ...(validation.edgeWarningCount > 0
        ? [`${validation.edgeWarningCount} dimension mismatch${validation.edgeWarningCount > 1 ? 'es' : ''} detected.`]
        : []),
    ];
    return lines.join('\n');
  };

  const handleStartTraining = () => {
    if (hasBlockingErrors) {
      toast.danger("Cannot Start Training", {
        description: buildErrorDescription(),
        timeout: 3000,
      });
      return;
    }

    if (hasWarningsOnly) {
      toast.warning("Graph Has Warnings", {
        description: buildWarningDescription(),
        timeout: 0,
        actionProps: {
          children: "Train Anyway",
          onPress: () => {
            toast.clear();
            setShowConfig(false);
            onTrain();
          },
        },
      });
      return;
    }

    setShowConfig(false);
    onTrain();
  };

  return (
    <div className="relative">
      <Button onPress={() => setShowConfig(!showConfig)} variant="primary">
        <span>Train</span>
        <Settings size={15} className="transition-transform" />
      </Button>

      {showConfig && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-stone-200 p-5 z-50 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center mb-4">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Training Config</h3>
          </div>

          <div className="space-y-4">
            {/* Loss */}
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter mb-1">Loss Function</div>
              <Select
                aria-label="Loss Function"
                variant="secondary"
                value={trainingConfig.loss}
                onChange={(value) => { if (value) setTrainingConfig({ loss: String(value) }); }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="CrossEntropy" textValue="CrossEntropy (Classification)">CrossEntropy (Classification)</ListBox.Item>
                    <ListBox.Item id="MSELoss" textValue="MSELoss (Regression)">MSELoss (Regression)</ListBox.Item>
                    <ListBox.Item id="L1Loss" textValue="L1Loss">L1Loss</ListBox.Item>
                    <ListBox.Item id="NLLLoss" textValue="NLLLoss">NLLLoss</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Optimizer */}
            <div>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter mb-1">Optimizer</div>
              <Select
                aria-label="Optimizer"
                variant="secondary"
                value={trainingConfig.optimizer}
                onChange={(value) => { if (value) setTrainingConfig({ optimizer: String(value) }); }}
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="Adam" textValue="Adam (Recommended)">Adam (Recommended)</ListBox.Item>
                    <ListBox.Item id="SGD" textValue="SGD">SGD</ListBox.Item>
                    <ListBox.Item id="RMSprop" textValue="RMSprop">RMSprop</ListBox.Item>
                    <ListBox.Item id="Adagrad" textValue="Adagrad">Adagrad</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Learning Rate & Epochs Grid */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter">Learn Rate</div>
                <Input
                  type="number"
                  step="0.0001"
                  value={String(trainingConfig.learning_rate)}
                  onChange={(e) => setTrainingConfig({ learning_rate: parseFloat(e.target.value) })}
                  className="w-full text-xs"
                  variant="secondary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-tighter">Epochs</div>
                <Input
                  type="number"
                  step="1"
                  value={String(trainingConfig.epochs)}
                  onChange={(e) => setTrainingConfig({ epochs: parseInt(e.target.value) })}
                  className="w-full text-xs"
                  variant="secondary"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onPress={handleStartTraining} variant="primary" fullWidth>
                Start Training
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
