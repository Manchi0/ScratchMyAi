import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Play } from 'lucide-react';

interface DrawCanvasProps {
  onPredict: (tensorData: any[]) => Promise<number[]>;
}

export function DrawCanvas({ onPredict }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidences, setConfidences] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handlePredict = async () => {
    const canvas = canvasRef.current;
    const hidden = hiddenCanvasRef.current;
    if (!canvas || !hidden) return;

    const ctx = canvas.getContext('2d');
    const hCtx = hidden.getContext('2d');
    if (!ctx || !hCtx) return;

    // 1. Downscale onto 28x28 hidden canvas
    hCtx.drawImage(canvas, 0, 0, 28, 28);
    const imageData = hCtx.getImageData(0, 0, 28, 28);

    // 2. Extract into [1, 1, 28, 28] nested array with PyTorch MNIST normalization
    const batch = [];
    const channel = [];
    
    for (let y = 0; y < 28; y++) {
      const row = [];
      for (let x = 0; x < 28; x++) {
         const idx = (y * 28 + x) * 4;
         // R channel representing grayscale intensity (0 = black, 255 = white)
         const px = imageData.data[idx] / 255.0;
         const normalized = (px - 0.1307) / 0.3081;
         row.push(normalized);
      }
      channel.push(row);
    }
    batch.push([channel]); // Shape [1, 1, 28, 28]

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
        <p className="text-sm text-stone-500">Draw a digit (0-9) below.</p>
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
            width={28}
            height={28}
            className="hidden"
        />
      </div>

      {prediction !== null && confidences.length > 0 && (
        <div className="w-full max-w-md rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium text-stone-600">Top prediction</span>
            <span className="text-lg font-semibold text-stone-900">{prediction}</span>
          </div>
          <div className="space-y-2">
            {confidences.map((probability, digit) => (
              <div key={digit} className="grid grid-cols-[1.5rem_1fr_3.5rem] items-center gap-2 text-xs">
                <span className={`font-semibold ${digit === prediction ? 'text-indigo-700' : 'text-stone-500'}`}>{digit}</span>
                <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full ${digit === prediction ? 'bg-indigo-600' : 'bg-stone-400'}`}
                    style={{ width: `${Math.max(0, Math.min(100, probability * 100))}%` }}
                  />
                </div>
                <span className={`text-right ${digit === prediction ? 'font-semibold text-indigo-700' : 'text-stone-500'}`}>
                  {(probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex w-full justify-center gap-3">
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
