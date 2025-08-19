import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAIModelWorker } from '../hooks/useAIModelWorker';
import type { ModelStatus, ProgressUpdate } from '../hooks/useAIModelWorker';

interface AIModelContextType {
  modelStatus: ModelStatus;
  loadedModelName: string;
  progressUpdate: ProgressUpdate | null;
  generateText: (prompt: string, options?: any) => Promise<any>;
  retryLoading: () => void;
}

const AIModelContext = createContext<AIModelContextType | undefined>(undefined);

export const useAIModel = () => {
  const context = useContext(AIModelContext);
  if (context === undefined) {
    throw new Error('useAIModel must be used within an AIModelProvider');
  }
  return context;
};

interface AIModelProviderProps {
  children: ReactNode;
}

export const AIModelProvider = ({ children }: AIModelProviderProps) => {
  const workerData = useAIModelWorker();

  return (
    <AIModelContext.Provider value={workerData}>
      {children}
    </AIModelContext.Provider>
  );
};