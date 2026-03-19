import { Settings } from "lucide-react";
import { Button } from "@heroui/react/button";
import { Select } from "@heroui/react/select";
import { Input } from "@heroui/react/input";
import { ListBox } from "@heroui/react/list-box";

interface TrainingConfig {
  loss: string;
  optimizer: string;
  learning_rate: number;
  epochs: number;
}

interface TrainButtonProps {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  trainingConfig: TrainingConfig;
  setTrainingConfig: (config: Partial<TrainingConfig>) => void;
  onTrain: () => void;
  onExport: () => void;
}

export function TrainButton({
  showConfig,
  setShowConfig,
  trainingConfig,
  setTrainingConfig,
  onTrain,
  onExport,
}: TrainButtonProps) {
  return (
    <div className="relative">
      <Button
        onPress={() => setShowConfig(!showConfig)}
        variant={showConfig ? "tertiary" : "primary"}
      >
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

            <div className="flex flex gap-2">
              <Button
                onPress={() => {
                  setShowConfig(false);
                  onTrain();
                }}
                variant="primary"
                fullWidth
              >
                Start Training
              </Button>
              <Button
                onPress={onExport}
                variant="outline"
                fullWidth
              >
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
