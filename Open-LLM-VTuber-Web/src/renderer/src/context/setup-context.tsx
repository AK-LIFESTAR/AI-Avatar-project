import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

interface SetupContextType {
  isSetupComplete: boolean;
  isLoading: boolean;
  apiKey: string;
  setApiKey: (key: string) => void;
  completeSetup: () => Promise<boolean>;
  resetSetup: () => void;
  error: string | null;
  clearError: () => void;
}

const SetupContext = createContext<SetupContextType | null>(null);

const STORAGE_KEY = 'project-a-setup-complete';
const API_KEY_STORAGE = 'project-a-api-key';

export function SetupProvider({ children }: { children: ReactNode }) {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  });
  const [error, setError] = useState<string | null>(null);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const completeSetup = useCallback(async (): Promise<boolean> => {
    if (!apiKey || apiKey.trim().length < 10) {
      setError('Please enter a valid API key');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the backend base URL from localStorage or use default
      const baseUrl = localStorage.getItem('baseUrl') || 'http://127.0.0.1:12393';
      
      // Send API key to backend to save in conf.yaml
      const response = await fetch(`${baseUrl}/api/config/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          provider: 'openai_llm',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save API key');
      }

      // Save to local storage for persistence
      localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsSetupComplete(true);
      return true;
    } catch (err: any) {
      console.error('Setup error:', err);
      // If backend is not available, still allow setup (offline mode)
      if (err.message.includes('fetch') || err.message.includes('network')) {
        localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsSetupComplete(true);
        return true;
      }
      setError(err.message || 'Failed to complete setup');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  const resetSetup = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(API_KEY_STORAGE);
    setIsSetupComplete(false);
    setApiKeyState('');
    setError(null);
  }, []);

  const value = useMemo(() => ({
    isSetupComplete,
    isLoading,
    apiKey,
    setApiKey,
    completeSetup,
    resetSetup,
    error,
    clearError,
  }), [isSetupComplete, isLoading, apiKey, setApiKey, completeSetup, resetSetup, error, clearError]);

  return (
    <SetupContext.Provider value={value}>
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
}



