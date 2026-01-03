import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface ComputerUseAction {
  action_type: string;
  action_number: number;
  success: boolean;
  error?: string;
  summary?: string;
  timestamp: string;
}

export interface ComputerUseState {
  isEnabled: boolean;
  isRunning: boolean;
  status: string;
  currentGoal: string | null;
  currentThought: string | null;
  observation: string | null;
  thinking: string | null;
  nextStep: string | null;
  osType: string | null;
  actionCount: number;
  maxActions: number;
  actions: ComputerUseAction[];
  lastError: string | null;
}

interface ComputerUseContextType {
  state: ComputerUseState;
  startSession: (goal: string) => void;
  stopSession: () => void;
  handleUpdate: (update: any) => void;
  clearHistory: () => void;
}

const defaultState: ComputerUseState = {
  isEnabled: false,
  isRunning: false,
  status: 'idle',
  currentGoal: null,
  currentThought: null,
  observation: null,
  thinking: null,
  nextStep: null,
  osType: null,
  actionCount: 0,
  maxActions: 50,
  actions: [],
  lastError: null,
};

const ComputerUseContext = createContext<ComputerUseContextType | undefined>(undefined);

export function ComputerUseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComputerUseState>(defaultState);

  const startSession = useCallback((goal: string) => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      status: 'starting',
      currentGoal: goal,
      currentThought: '🚀 Starting autonomous session...',
      observation: null,
      thinking: null,
      nextStep: null,
      actionCount: 0,
      actions: [],
      lastError: null,
    }));
  }, []);

  const stopSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      status: 'stopped',
      currentThought: 'Session stopped by user',
    }));
  }, []);

  const handleUpdate = useCallback((update: any) => {
    // Handle both the new unified status format and legacy formats
    const status = update.status || update.type;
    console.log('ComputerUseContext handling update:', status, update);

    switch (status) {
      case 'started':
      case 'computer_use_start':
        setState(prev => ({
          ...prev,
          isRunning: true,
          status: 'running',
          currentGoal: update.goal || prev.currentGoal,
          osType: update.os_type || prev.osType,
          currentThought: update.message || `🖥️ Controlling ${update.os_type || 'computer'}...`,
          actionCount: 0,
          actions: [],
          lastError: null,
        }));
        break;

      case 'thinking':
        setState(prev => ({
          ...prev,
          status: 'thinking',
          currentThought: update.thought || '🔍 Analyzing screen...',
          actionCount: update.action_count ?? prev.actionCount,
        }));
        break;

      case 'thought':
      case 'computer_use_thought':
        setState(prev => ({
          ...prev,
          status: 'thinking',
          currentThought: update.thought || update.message,
          observation: update.observation || prev.observation,
          thinking: update.thinking || prev.thinking,
          nextStep: update.next_step || prev.nextStep,
          actionCount: update.action_count ?? prev.actionCount,
        }));
        break;

      case 'action':
      case 'computer_use_action':
        const action: ComputerUseAction = {
          action_type: update.action_type,
          action_number: update.action_number || update.action_count,
          success: update.success,
          error: update.error,
          summary: update.summary,
          timestamp: new Date().toISOString(),
        };
        setState(prev => ({
          ...prev,
          status: 'running',
          actionCount: update.action_number || update.action_count || prev.actionCount + 1,
          maxActions: update.max_actions || prev.maxActions,
          actions: [...prev.actions, action],
          lastError: update.success ? null : update.error,
        }));
        break;

      case 'completed':
      case 'goal_completed':
        setState(prev => ({
          ...prev,
          status: 'completed',
          isRunning: false,
          currentThought: `✅ ${update.message || update.thought || 'Goal completed!'}`,
          observation: null,
          thinking: null,
          nextStep: null,
        }));
        break;

      case 'error':
      case 'computer_use_error':
        setState(prev => ({
          ...prev,
          status: 'error',
          lastError: update.error || update.message,
          isRunning: false,
        }));
        break;

      case 'kill_switch':
      case 'safety_stop':
        setState(prev => ({
          ...prev,
          status: 'stopped',
          isRunning: false,
          lastError: update.message || '🛑 Emergency stop triggered',
        }));
        break;

      case 'max_actions':
      case 'max_actions_reached':
        setState(prev => ({
          ...prev,
          status: 'max_actions',
          isRunning: false,
          currentThought: `📊 ${update.message || 'Maximum actions reached'}`,
        }));
        break;

      case 'cancelled':
        setState(prev => ({
          ...prev,
          status: 'cancelled',
          isRunning: false,
          currentThought: '⏹️ Session cancelled',
        }));
        break;

      case 'ended':
      case 'session_end':
        setState(prev => ({
          ...prev,
          status: 'ended',
          isRunning: false,
          actionCount: update.total_actions ?? prev.actionCount,
        }));
        break;

      default:
        console.log('Unhandled computer use status:', status);
        break;
    }
  }, []);

  // Listen for computer_use_status events from WebSocket handler
  useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleUpdate(customEvent.detail);
    };
    
    window.addEventListener('computer_use_status', handleEvent);
    
    return () => {
      window.removeEventListener('computer_use_status', handleEvent);
    };
  }, [handleUpdate]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      actions: [],
      actionCount: 0,
      currentThought: null,
      observation: null,
      thinking: null,
      nextStep: null,
      lastError: null,
      status: 'idle',
    }));
  }, []);

  return (
    <ComputerUseContext.Provider
      value={{
        state,
        startSession,
        stopSession,
        handleUpdate,
        clearHistory,
      }}
    >
      {children}
    </ComputerUseContext.Provider>
  );
}

export function useComputerUse() {
  const context = useContext(ComputerUseContext);
  if (context === undefined) {
    throw new Error('useComputerUse must be used within a ComputerUseProvider');
  }
  return context;
}
