import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@heroui/react';
import { useStore } from '@/store/useStore';

interface TrainingConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  graphData: any;
  title: string;
}

export function TrainingConsole({ isOpen, onClose, graphData, title }: TrainingConsoleProps) {
  const navigate = useNavigate();
  const setLastTrainingResult = useStore((s) => s.setLastTrainingResult);
  const [logs, setLogs] = useState<{ id: string; type: 'log' | 'error' | 'done'; message: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'training' | 'success' | 'error'>('idle');
  const [modelId, setModelId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const hasStartedForOpenRef = useRef(false);
  const isStartInFlightRef = useRef(false);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!isOpen) {
      hasStartedForOpenRef.current = false;
      isStartInFlightRef.current = false;
      return;
    }

    if (!hasStartedForOpenRef.current) {
      hasStartedForOpenRef.current = true;
      startTraining();
    }
  }, [isOpen]);

  const startTraining = async () => {
    if (isStartInFlightRef.current) {
      return;
    }

    isStartInFlightRef.current = true;
    setStatus('training');
    setLogs([{ id: 'start', type: 'log', message: 'Initiating training job...' }]);
    setModelId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('http://localhost:8000/models/train', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: title || "Untitled Model",
          dataset: graphData?.dataset || "mnist",
          graph_json: graphData
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not get stream reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;
            
            try {
               const data = JSON.parse(dataStr);
               
               if (data.type === 'done') {
                 setModelId(data.model_id);
                 setStatus('success');
                 setLastTrainingResult({
                   accuracy: data.accuracy ?? null,
                   loss: data.loss ?? null,
                   epochs: data.epochs ?? null,
                   training_time_seconds: data.training_time_seconds ?? null,
                 });
               } else {
                 setLogs(prev => [...prev, { id: Math.random().toString(), type: data.type, message: data.message }]);
                 if (data.type === 'error') {
                   setStatus('error');
                 }
               }
            } catch(e) {
               console.error("Failed to parse SSE data:", dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      setStatus('error');
      setLogs(prev => [...prev, { id: 'err', type: 'error', message: err.message || 'Unknown error occurred' }]);
    } finally {
      isStartInFlightRef.current = false;
    }
  };

  const handleClose = () => {
    // Reset state on close if finished or error
    if (status !== 'training') {
      setStatus('idle');
      setLogs([]);
      setModelId(null);
      onClose();
    }
  };

  const handlePrimaryAction = () => {
    if (status === 'success' && modelId) {
      handleClose();
      navigate(`/dashboard?tab=inference&model=${encodeURIComponent(modelId)}`);
      return;
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#e8e7e2]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e7e2] bg-stone-50 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 tracking-tight">Training Model: {title || "Untitled"}</h2>
            <p className="text-xs font-medium text-stone-500 mt-0.5">Offloading compute directly to Modal Cloud GPUs</p>
          </div>
          <button 
            onClick={handleClose}
            disabled={status === 'training'}
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Logs Terminal */}
        <div className="flex-1 bg-stone-900 overflow-y-auto p-4 font-mono text-sm shadow-inner relative min-h-[300px]">
          {logs.map((log) => (
             <div key={log.id} className={`mb-1.5 leading-relaxed break-words ${
               log.type === 'error' ? 'text-red-400 font-medium' : 'text-stone-300'
             }`}>
               <span className="text-stone-500 mr-2 select-none">&gt;</span>
               {log.message}
             </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Footer Status */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e8e7e2] bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            {status === 'training' && (
              <>
                <Loader2 size={18} className="animate-spin text-[#111]" />
                <span className="text-sm font-semibold text-[#111]">Training in progress...</span>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Model trained & saved successfully!</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle size={18} className="text-red-600" />
                <span className="text-sm font-semibold text-red-700">Training failed. See logs above.</span>
              </>
            )}
          </div>
          
          <Button
            onPress={handlePrimaryAction}
            isDisabled={status === 'training'}
            className={status === 'training' ? 'bg-stone-200 text-stone-400 opacity-50' : 'bg-[#1a1a1a] text-white shadow-sm font-medium'}
          >
            {status === 'success' ? 'Go Test Model' : 'Close'}
          </Button>
        </div>

      </div>
    </div>
  );
}
