import { useCallback, useEffect, useRef, useState } from 'react';

export interface WorkerMessage {
  id: string;
  type: 'INITIALIZE_MODEL' | 'GENERATE_TEXT' | 'MODEL_READY' | 'TEXT_GENERATED' | 'ERROR' | 'PROGRESS';
  payload?: any;
}

export type ModelStatus = 'loading' | 'loaded' | 'failed';

export interface ProgressUpdate {
  status: string;
  progress: number;
}

export interface UseAIModelWorkerReturn {
  modelStatus: ModelStatus;
  loadedModelName: string;
  progressUpdate: ProgressUpdate | null;
  generateText: (prompt: string, options?: any) => Promise<any>;
  retryLoading: () => void;
}

let workerInstance: Worker | null = null;

export const useAIModelWorker = (): UseAIModelWorkerReturn => {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');
  const [loadedModelName, setLoadedModelName] = useState<string>('');
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());
  const isInitializedRef = useRef<boolean>(false);

  const initializeWorker = useCallback(() => {
    if (workerInstance) {
      workerRef.current = workerInstance;
      return;
    }

    // Create worker instance with JavaScript file for better Vite compatibility
    const worker = new Worker(
      new URL('../workers/aiModelWorker.js', import.meta.url),
      { type: 'module' }
    );

    workerInstance = worker;
    workerRef.current = worker;

    // Handle worker messages
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id, type, payload } = event.data;

      switch (type) {
        case 'MODEL_READY':
          setModelStatus('loaded');
          setLoadedModelName(payload.modelName);
          setProgressUpdate({ status: 'Model ready!', progress: 100 });
          // Clear progress after a short delay
          setTimeout(() => setProgressUpdate(null), 2000);
          
          const readyRequest = pendingRequests.current.get(id);
          if (readyRequest) {
            readyRequest.resolve(payload);
            pendingRequests.current.delete(id);
          }
          break;

        case 'PROGRESS':
          setProgressUpdate(payload);
          break;

        case 'TEXT_GENERATED':
          const textRequest = pendingRequests.current.get(id);
          if (textRequest) {
            textRequest.resolve(payload.result);
            pendingRequests.current.delete(id);
          }
          break;

        case 'ERROR':
          console.error('Worker error:', payload.error);
          setModelStatus('failed');
          setProgressUpdate({ status: 'Model loading failed', progress: 0 });
          
          const errorRequest = pendingRequests.current.get(id);
          if (errorRequest) {
            errorRequest.reject(new Error(payload.error));
            pendingRequests.current.delete(id);
          }
          break;
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setModelStatus('failed');
    };

    return worker;
  }, []);

  const sendWorkerMessage = useCallback((type: string, payload?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      pendingRequests.current.set(id, { resolve, reject });

      // Set timeout for requests
      const timeout = setTimeout(() => {
        pendingRequests.current.delete(id);
        reject(new Error('Worker request timeout'));
      }, 60000); // 60 second timeout

      // Clear timeout when request resolves
      const originalResolve = resolve;
      const originalReject = reject;
      
      pendingRequests.current.set(id, { 
        resolve: (result: any) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });

      workerRef.current.postMessage({ id, type, payload });
    });
  }, []);

  const generateText = useCallback(async (prompt: string, options?: any) => {
    if (modelStatus !== 'loaded') {
      throw new Error('Model not loaded');
    }

    return sendWorkerMessage('GENERATE_TEXT', { prompt, options });
  }, [modelStatus, sendWorkerMessage]);

  const retryLoading = useCallback(() => {
    // Terminate existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      workerInstance = null;
    }

    // Clear pending requests
    pendingRequests.current.clear();
    
    // Reset state
    setModelStatus('loading');
    setLoadedModelName('');
    setProgressUpdate(null);
    isInitializedRef.current = false;

    // Reinitialize
    const worker = initializeWorker();
    if (worker) {
      sendWorkerMessage('INITIALIZE_MODEL').catch(console.error);
    }
  }, [initializeWorker, sendWorkerMessage]);

  // Initialize worker and model on mount with a delay for smoother initial load
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const worker = initializeWorker();
      if (worker) {
        // Delay model loading by 2 seconds to let the page settle first
        setTimeout(() => {
          sendWorkerMessage('INITIALIZE_MODEL').catch(() => {
            setModelStatus('failed');
          });
        }, 2000);
      }
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current && workerInstance === workerRef.current) {
        // Don't terminate the shared worker instance on unmount
        // It will be reused by other components
      }
    };
  }, [initializeWorker, sendWorkerMessage]);

  return {
    modelStatus,
    loadedModelName,
    progressUpdate,
    generateText,
    retryLoading
  };
};