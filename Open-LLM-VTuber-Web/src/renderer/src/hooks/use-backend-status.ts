import { useState, useEffect, useCallback } from 'react';

export type BackendStatus = 'checking' | 'starting' | 'downloading' | 'ready' | 'error';

interface BackendStatusHook {
  status: BackendStatus;
  downloadProgress?: number;
  isReady: boolean;
  error?: string;
  retry: () => void;
}

const BACKEND_URL = 'http://localhost:12393';
const POLL_INTERVAL = 2000; // Check every 2 seconds
const MAX_RETRIES = 300; // 10 minutes at 2 second intervals

export function useBackendStatus(): BackendStatusHook {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const [checkCount, setCheckCount] = useState(0);

  const checkBackend = useCallback(async (): Promise<boolean> => {
    try {
      // Try to connect to the backend's root endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${BACKEND_URL}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // If we get any response (even an error page), the backend is running
      if (response.ok || response.status === 404) {
        return true;
      }
      return false;
    } catch {
      // Connection refused or network error - backend not ready
      return false;
    }
  }, []);

  const startPolling = useCallback(() => {
    setStatus('checking');
    setCheckCount(0);
    setError(undefined);
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (!mounted) return;

      const isReady = await checkBackend();
      
      if (!mounted) return;

      if (isReady) {
        setStatus('ready');
        return;
      }

      // Still waiting...
      setCheckCount(prev => {
        const newCount = prev + 1;
        
        // After 5 checks (10 seconds), assume we're in startup/download mode
        if (newCount > 5 && newCount <= 15) {
          setStatus('starting');
        } else if (newCount > 15) {
          // After 30 seconds, probably downloading
          setStatus('downloading');
          // Estimate progress based on time (rough approximation)
          // Assume download takes about 5-10 minutes
          const estimatedProgress = Math.min(95, Math.floor(((newCount - 15) / 150) * 100));
          setDownloadProgress(estimatedProgress);
        }
        
        return newCount;
      });

      // Keep polling if not ready and haven't exceeded max retries
      if (checkCount < MAX_RETRIES) {
        timeoutId = setTimeout(poll, POLL_INTERVAL);
      } else {
        setStatus('error');
        setError('Backend did not start within expected time. Please restart the app.');
      }
    };

    // Start polling immediately
    poll();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkBackend, retryCount]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    startPolling();
  }, [startPolling]);

  return {
    status,
    downloadProgress,
    isReady: status === 'ready',
    error,
    retry,
  };
}

