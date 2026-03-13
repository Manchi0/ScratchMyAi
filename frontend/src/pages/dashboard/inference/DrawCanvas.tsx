import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Play, Upload } from 'lucide-react';

interface DrawCanvasProps {
  onPredict: (tensorData: any[]) => Promise<number[]>;
  dataset?: string;
}

const FASHION_MNIST_LABELS = [
  'T-shirt/top',
  'Trouser',
  'Pullover',
  'Dress',
  'Coat',
  'Sandal',
  'Shirt',
  'Sneaker',
  'Bag',
  'Ankle boot',
];

const DIGIT_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const CIFAR10_LABELS = [
  'airplane',
  'automobile',
  'bird',
  'cat',
  'deer',
  'dog',
  'frog',
  'horse',
  'ship',
  'truck',
];

type DatasetProfile = {
  inputSize: number;
  channels: 1 | 3;
  mean: number[];
  std: number[];
  labels: string[];
  prompt: string;
};

const getDatasetKey = (dataset?: string): string => {
  return (dataset ?? '').toLowerCase().trim();
};

const getDatasetProfile = (dataset?: string): DatasetProfile => {
  const key = getDatasetKey(dataset);
  if (key === 'cifar10' || key === 'cifar-10') {
    return {
      inputSize: 32,
      channels: 3,
      mean: [0.4914, 0.4822, 0.4465],
      std: [0.247, 0.2435, 0.2616],
      labels: CIFAR10_LABELS,
      prompt: 'Draw or upload a CIFAR-10 style image below.',
    };
  }

  if (key === 'fashionmnist' || key === 'fashion_mnist' || key === 'fashion-mnist') {
    return {
      inputSize: 28,
      channels: 1,
      mean: [0.286],
      std: [0.353],
      labels: FASHION_MNIST_LABELS,
      prompt: 'Draw or upload a fashion item image below.',
    };
  }
  return {
    inputSize: 28,
    channels: 1,
    mean: [0.1307],
    std: [0.3081],
    labels: DIGIT_LABELS,
    prompt: 'Draw or upload a digit image below.',
  };
};

export function DrawCanvas({ onPredict, dataset }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidences, setConfidences] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const profile = getDatasetProfile(dataset);
  const labels = profile.labels;

  // Initialize black background
  useEffect(() => {
    clearCanvas();
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPrediction(null);
    setConfidences([]);
  };

  const softmax = (values: number[]): number[] => {
    if (values.length === 0) return [];
    const max = Math.max(...values);
    const exps = values.map((v) => Math.exp(v - max));
    const sum = exps.reduce((acc, val) => acc + val, 0);
    if (sum === 0) return values.map(() => 0);
    return exps.map((v) => v / sum);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.beginPath(); // start a new path for next stroke
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 20; // Thick enough stroke for 280x280 down to 28x28
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const canvas = canvasRef.current;
    if (!file || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fit image fully inside canvas while keeping aspect ratio.
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const drawX = (canvas.width - drawWidth) / 2;
      const drawY = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      setPrediction(null);
      setConfidences([]);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Could not load this image. Please try another file.');
    };

    img.src = url;
    // Reset input so the same file can be selected again.
    e.target.value = '';
  };

  const handlePredict = async () => {
    const canvas = canvasRef.current;
    const hidden = hiddenCanvasRef.current;
    if (!canvas || !hidden) return;

    const ctx = canvas.getContext('2d');
    const hCtx = hidden.getContext('2d');
    if (!ctx || !hCtx) return;

    // 1. Downscale onto hidden canvas with dataset-specific input size
    hCtx.clearRect(0, 0, hidden.width, hidden.height);
    hCtx.drawImage(canvas, 0, 0, profile.inputSize, profile.inputSize);
    const imageData = hCtx.getImageData(0, 0, profile.inputSize, profile.inputSize);

    // 2. Build tensor in expected shape:
    // grayscale datasets -> [1, 1, H, W]
    // CIFAR-10 -> [1, 3, H, W]
    let batch: number[][][][] = [];

    if (profile.channels === 1) {
      const channel: number[][] = [];
      const grayscale: number[] = [];
      let sumGray = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i] / 255.0;
        const g = imageData.data[i + 1] / 255.0;
        const b = imageData.data[i + 2] / 255.0;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        grayscale.push(gray);
        sumGray += gray;
      }

      const meanGray = sumGray / grayscale.length;
      const shouldInvert = meanGray > 0.5;

      for (let y = 0; y < profile.inputSize; y++) {
        const row: number[] = [];
        for (let x = 0; x < profile.inputSize; x++) {
          const idx = y * profile.inputSize + x;
          const gray = grayscale[idx];
          const px = shouldInvert ? (1 - gray) : gray;
          const normalized = (px - profile.mean[0]) / profile.std[0];
          row.push(normalized);
        }
        channel.push(row);
      }

      batch = [[channel]];
    } else {
      const channelR: number[][] = [];
      const channelG: number[][] = [];
      const channelB: number[][] = [];

      for (let y = 0; y < profile.inputSize; y++) {
        const rowR: number[] = [];
        const rowG: number[] = [];
        const rowB: number[] = [];

        for (let x = 0; x < profile.inputSize; x++) {
          const idx = (y * profile.inputSize + x) * 4;
          const r = imageData.data[idx] / 255.0;
          const g = imageData.data[idx + 1] / 255.0;
          const b = imageData.data[idx + 2] / 255.0;

          rowR.push((r - profile.mean[0]) / profile.std[0]);
          rowG.push((g - profile.mean[1]) / profile.std[1]);
          rowB.push((b - profile.mean[2]) / profile.std[2]);
        }

        channelR.push(rowR);
        channelG.push(rowG);
        channelB.push(rowB);
      }

      batch = [[channelR, channelG, channelB]];
    }

    // 3. Send to InferenceService
    setLoading(true);
    try {
      const rawOutput = await onPredict(batch);
      // Ensure we are getting the actual logits array, whether it's wrapped in multiple batch dimensions or not
      let logits = rawOutput;
      while (logits.length > 0 && Array.isArray(logits[0])) {
         logits = logits[0];
      }

      if (!Array.isArray(logits) || logits.length === 0) {
        throw new Error('Model output is empty or invalid');
      }

      const numericLogits = (logits as unknown[]).map((value) => {
        if (typeof value !== 'number') {
          throw new Error('Model output contains non-numeric values');
        }
        return value;
      });
      const probabilityVector = softmax(numericLogits);
      
      const maxIndex = probabilityVector.indexOf(Math.max(...probabilityVector));
      setPrediction(maxIndex);
      setConfidences(probabilityVector);
    } catch (err) {
      console.error(err);
      alert("Prediction failed. " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-white rounded-2xl shadow-sm border border-[#e8e7e2]">
      
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-stone-800 tracking-tight">Try your Model</h3>
        <p className="text-sm text-stone-500">{profile.prompt}</p>
      </div>

      <div className="relative group">
         {/* Visible Canvas (280x280) */}
        <canvas
            ref={canvasRef}
            width={280}
            height={280}
            onMouseDown={startDrawing}
            onMouseUp={endDrawing}
            onMouseOut={endDrawing}
            onMouseMove={draw}
            className="rounded-xl shadow-inner cursor-crosshair border-2 border-stone-200"
            style={{ touchAction: 'none' }}
        />
        <canvas 
            ref={hiddenCanvasRef}
          width={profile.inputSize}
          height={profile.inputSize}
            className="hidden"
        />
      </div>

      {prediction !== null && confidences.length > 0 && (
        <div className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium text-stone-600">Top prediction</span>
            <span className="text-lg font-semibold text-stone-900">{labels[prediction] ?? prediction}</span>
          </div>
          <div className="space-y-2">
            {confidences.map((probability, classIndex) => (
              <div key={classIndex} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 text-xs">
                <span className={`truncate font-semibold ${classIndex === prediction ? 'text-indigo-700' : 'text-stone-500'}`}>
                  {labels[classIndex] ?? classIndex}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full ${classIndex === prediction ? 'bg-indigo-600' : 'bg-stone-400'}`}
                    style={{ width: `${Math.max(0, Math.min(100, probability * 100))}%` }}
                  />
                </div>
                <span className={`text-right ${classIndex === prediction ? 'font-semibold text-indigo-700' : 'text-stone-500'}`}>
                  {(probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex w-full justify-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={handlePickImage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800 transition-colors focus:outline-none"
        >
          <Upload size={16} />
          Upload Photo
        </button>
        <button 
            onClick={clearCanvas}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800 transition-colors focus:outline-none"
        >
            <RefreshCw size={16} />
            Clear
        </button>
        <button 
            onClick={handlePredict}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none shadow-sm ${
               loading 
               ? 'bg-indigo-400 text-white cursor-not-allowed'
               : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
            <Play size={16} className={loading ? "animate-pulse" : ""} />
            {loading ? 'Thinking...' : 'Predict'}
        </button>
      </div>
    </div>
  );
}
