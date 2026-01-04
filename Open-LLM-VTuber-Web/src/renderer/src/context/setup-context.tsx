import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

interface SetupContextType {
  isSetupComplete: boolean;
  isCheckingSetup: boolean;
  isLoading: boolean;
  apiKey: string;
  setApiKey: (key: string) => void;
  pcControlEnabled: boolean;
  setPcControlEnabled: (enabled: boolean) => void;
  completeSetup: () => Promise<boolean>;
  resetSetup: () => void;
  error: string | null;
  clearError: () => void;
}

const SetupContext = createContext<SetupContextType | null>(null);

const STORAGE_KEY = 'project-a-setup-complete';
const API_KEY_STORAGE = 'project-a-api-key';
const PC_CONTROL_STORAGE = 'project-a-pc-control';

export function SetupProvider({ children }: { children: ReactNode }) {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  });
  const [pcControlEnabled, setPcControlEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(PC_CONTROL_STORAGE);
    return stored === 'true';
  });
  const [error, setError] = useState<string | null>(null);

  // Check if API key is actually configured in the backend on startup
  useEffect(() => {
    const checkBackendApiKey = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const baseUrl = localStorage.getItem('baseUrl') || 'http://127.0.0.1:12393';
        const response = await fetch(`${baseUrl}/api/config/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          // Only mark as complete if backend confirms API key is configured
          if (data.api_key_configured) {
            setIsSetupComplete(true);
            localStorage.setItem(STORAGE_KEY, 'true');
          } else {
            // API key not configured - show onboarding
            setIsSetupComplete(false);
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          // Backend not responding properly - check localStorage as fallback
          const stored = localStorage.getItem(STORAGE_KEY);
          const hasStoredKey = localStorage.getItem(API_KEY_STORAGE);
          setIsSetupComplete(stored === 'true' && !!hasStoredKey);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        // Backend not available or timeout - use localStorage fallback
        const stored = localStorage.getItem(STORAGE_KEY);
        const hasStoredKey = localStorage.getItem(API_KEY_STORAGE);
        setIsSetupComplete(stored === 'true' && !!hasStoredKey);
      } finally {
        setIsCheckingSetup(false);
      }
    };

    checkBackendApiKey();
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    setError(null);
  }, []);

  const setPcControlEnabled = useCallback((enabled: boolean) => {
    setPcControlEnabledState(enabled);
    localStorage.setItem(PC_CONTROL_STORAGE, enabled ? 'true' : 'false');
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

    // Helper function for fetch with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      // Get the backend base URL from localStorage or use default
      const baseUrl = localStorage.getItem('baseUrl') || 'http://127.0.0.1:12393';
      
      // Send API key to backend to save in conf.yaml
      const apiKeyResponse = await fetchWithTimeout(`${baseUrl}/api/config/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          provider: 'openai_llm',
        }),
      });

      if (!apiKeyResponse.ok) {
        const errorData = await apiKeyResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to save API key');
      }

      // Save PC Control setting to backend (don't fail if this doesn't work)
      try {
        await fetchWithTimeout(`${baseUrl}/api/config/computer-use`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: pcControlEnabled,
          }),
        }, 5000);
      } catch (pcErr) {
        console.warn('Failed to save PC Control setting, will use default:', pcErr);
      }

      // Save to local storage for persistence
      localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsSetupComplete(true);
      return true;
    } catch (err: any) {
      console.error('Setup error:', err);
      // If backend is not available or timeout, still allow setup (offline mode)
      if (err.name === 'AbortError' || err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
        console.log('Backend not responding, saving locally and proceeding...');
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
  }, [apiKey, pcControlEnabled]);

  const resetSetup = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(API_KEY_STORAGE);
    localStorage.removeItem(PC_CONTROL_STORAGE);
    setIsSetupComplete(false);
    setApiKeyState('');
    setPcControlEnabledState(false);
    setError(null);
  }, []);

  const value = useMemo(() => ({
    isSetupComplete,
    isCheckingSetup,
    isLoading,
    apiKey,
    setApiKey,
    pcControlEnabled,
    setPcControlEnabled,
    completeSetup,
    resetSetup,
    error,
    clearError,
  }), [isSetupComplete, isCheckingSetup, isLoading, apiKey, setApiKey, pcControlEnabled, setPcControlEnabled, completeSetup, resetSetup, error, clearError]);

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
