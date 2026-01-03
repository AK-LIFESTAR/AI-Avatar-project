import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  Collapsible,
  Progress,
} from '@chakra-ui/react';
import { 
  LuMonitor, 
  LuPlay, 
  LuSquare, 
  LuTrash2, 
  LuChevronDown, 
  LuChevronUp,
  LuMousePointer2,
  LuKeyboard,
  LuScroll,
  LuMove,
  LuCircleCheck,
  LuCircleX,
  LuBrain,
  LuSparkles,
  LuShield,
  LuZap,
  LuEye,
  LuTarget,
  LuArrowRight,
  LuClock,
  LuApple,
  LuMonitorSmartphone,
} from 'react-icons/lu';
import { useComputerUse } from '../../context/computer-use-context';
import { useWebSocket } from '../../context/websocket-context';

// Premium dark theme palette with enhanced colors
const colors = {
  // Backgrounds
  bgPrimary: 'rgba(10, 10, 15, 0.95)',
  bgCard: 'rgba(22, 22, 30, 0.8)',
  bgCardHover: 'rgba(32, 32, 42, 0.9)',
  bgInput: 'rgba(18, 18, 24, 0.9)',
  bgGlass: 'rgba(255, 255, 255, 0.02)',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  
  // Text
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  
  // Accents
  purple: '#8b5cf6',
  purpleGlow: 'rgba(139, 92, 246, 0.15)',
  cyan: '#06b6d4',
  cyanGlow: 'rgba(6, 182, 212, 0.15)',
  green: '#10b981',
  greenGlow: 'rgba(16, 185, 129, 0.15)',
  red: '#ef4444',
  redGlow: 'rgba(239, 68, 68, 0.15)',
  orange: '#f59e0b',
  orangeGlow: 'rgba(245, 158, 11, 0.15)',
  blue: '#3b82f6',
  blueGlow: 'rgba(59, 130, 246, 0.15)',
  yellow: '#eab308',
  yellowGlow: 'rgba(234, 179, 8, 0.15)',
};

const getActionIcon = (actionType: string) => {
  const iconProps = { size: 13 };
  switch (actionType?.toLowerCase()) {
    case 'click':
      return <LuMousePointer2 {...iconProps} />;
    case 'type':
      return <LuKeyboard {...iconProps} />;
    case 'scroll':
      return <LuScroll {...iconProps} />;
    case 'move':
    case 'drag':
      return <LuMove {...iconProps} />;
    case 'hotkey':
      return <LuKeyboard {...iconProps} />;
    case 'wait':
      return <LuClock {...iconProps} />;
    default:
      return <LuZap {...iconProps} />;
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'running':
    case 'starting':
      return { color: colors.green, bg: colors.greenGlow, label: 'RUNNING' };
    case 'thinking':
      return { color: colors.cyan, bg: colors.cyanGlow, label: 'THINKING' };
    case 'error':
      return { color: colors.red, bg: colors.redGlow, label: 'ERROR' };
    case 'completed':
      return { color: colors.blue, bg: colors.blueGlow, label: 'DONE' };
    case 'stopped':
    case 'cancelled':
      return { color: colors.orange, bg: colors.orangeGlow, label: 'STOPPED' };
    case 'max_actions':
      return { color: colors.yellow, bg: colors.yellowGlow, label: 'LIMIT' };
    default:
      return { color: colors.textMuted, bg: colors.bgCard, label: 'READY' };
  }
};

const getOSIcon = (osType: string | null) => {
  if (osType?.toLowerCase().includes('mac') || osType?.toLowerCase().includes('darwin')) {
    return <LuApple size={11} />;
  }
  return <LuMonitorSmartphone size={11} />;
};

export default function ComputerUsePanel() {
  const { state, startSession, stopSession, clearHistory } = useComputerUse();
  const { sendMessage } = useWebSocket();
  const [goal, setGoal] = useState('');
  const [showActions, setShowActions] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new actions are added
  useEffect(() => {
    if (scrollRef.current && state.actions.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [state.actions.length]);

  const handleStart = () => {
    if (!goal.trim()) return;
    console.log('Starting computer use with goal:', goal.trim());
    sendMessage({
      type: 'computer-use-start',
      goal: goal.trim(),
    });
    startSession(goal.trim());
  };

  const handleStop = () => {
    console.log('Stopping computer use');
    sendMessage({
      type: 'computer-use-stop',
    });
    stopSession();
  };

  const progressPercent = state.maxActions > 0 
    ? (state.actionCount / state.maxActions) * 100 
    : 0;

  const statusConfig = getStatusConfig(state.status);
  const hasAIThinking = state.observation || state.thinking || state.nextStep;

  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Fixed Header Section */}
      <Box 
        p={4} 
        pb={3}
        flexShrink={0}
        borderBottom={`1px solid ${colors.border}`}
        background={colors.bgGlass}
      >
        {/* Title Row */}
        <HStack justify="space-between" mb={3}>
          <HStack gap={3}>
            <Box
              p={2}
              borderRadius="xl"
              background={`linear-gradient(135deg, ${colors.purpleGlow}, ${colors.cyanGlow})`}
              border={`1px solid ${colors.border}`}
            >
              <LuMonitor size={18} color={colors.purple} />
            </Box>
            <Box>
              <Text fontWeight="600" color={colors.textPrimary} fontSize="sm" lineHeight="1.2">
                PC Control
              </Text>
              <HStack gap={1} mt={0.5}>
                <Text fontSize="10px" color={colors.textMuted} letterSpacing="0.5px">
                  AI AUTOMATION
                </Text>
                {state.osType && (
                  <HStack gap={0.5} color={colors.textMuted}>
                    <Text fontSize="10px">•</Text>
                    {getOSIcon(state.osType)}
                    <Text fontSize="10px">{state.osType}</Text>
                  </HStack>
                )}
              </HStack>
            </Box>
          </HStack>
          
          <Box
            px={2.5}
            py={1}
            borderRadius="full"
            background={statusConfig.bg}
            border={`1px solid ${statusConfig.color}30`}
          >
            <Text fontSize="10px" fontWeight="600" color={statusConfig.color} letterSpacing="0.5px">
              {statusConfig.label}
            </Text>
          </Box>
        </HStack>

        {/* Goal Input */}
        <Box>
          <Text fontSize="11px" fontWeight="500" color={colors.textMuted} mb={2} letterSpacing="0.3px">
            TASK INSTRUCTION
          </Text>
          <HStack gap={2}>
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Open Chrome, create a new doc, search for AI news..."
              size="sm"
              bg={colors.bgInput}
              border={`1px solid ${colors.border}`}
              borderRadius="lg"
              _hover={{ borderColor: colors.borderHover }}
              _focus={{ 
                borderColor: colors.purple, 
                boxShadow: `0 0 0 1px ${colors.purple}40`,
                outline: 'none'
              }}
              _placeholder={{ color: colors.textMuted }}
              color={colors.textPrimary}
              fontSize="13px"
              disabled={state.isRunning}
              onKeyPress={(e) => e.key === 'Enter' && !state.isRunning && handleStart()}
            />
            {state.isRunning ? (
              <IconButton
                aria-label="Stop"
                onClick={handleStop}
                size="sm"
                bg={colors.red}
                color="white"
                borderRadius="lg"
                _hover={{ bg: '#dc2626' }}
              >
                <LuSquare size={14} />
              </IconButton>
            ) : (
              <IconButton
                aria-label="Start"
                onClick={handleStart}
                size="sm"
                bg={colors.purple}
                color="white"
                borderRadius="lg"
                disabled={!goal.trim()}
                _hover={{ bg: '#7c3aed' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
              >
                <LuPlay size={14} />
              </IconButton>
            )}
          </HStack>
        </Box>
      </Box>

      {/* Scrollable Content Section */}
      <Box
        ref={scrollRef}
        flex={1}
        overflowY="auto"
        overflowX="hidden"
        p={4}
        pt={3}
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { 
            background: colors.border,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: colors.borderHover,
          },
        }}
      >
        <VStack gap={3} align="stretch">
          {/* Safety Notice - Compact */}
          <HStack
            p={2.5}
            borderRadius="lg"
            background={colors.orangeGlow}
            border={`1px solid ${colors.orange}25`}
            gap={2}
          >
            <LuShield size={14} color={colors.orange} style={{ flexShrink: 0 }} />
            <Text fontSize="11px" color={colors.orange} lineHeight="1.4">
              Move cursor to <strong>top-left corner</strong> to emergency stop
            </Text>
          </HStack>

          {/* Active Session Info */}
          {state.currentGoal && (
            <Box
              p={3}
              borderRadius="xl"
              background={colors.bgCard}
              border={`1px solid ${colors.border}`}
            >
              <HStack justify="space-between" mb={2}>
                <HStack gap={1.5}>
                  <LuTarget size={12} color={colors.cyan} />
                  <Text fontSize="10px" color={colors.textMuted} fontWeight="500" letterSpacing="0.3px">
                    CURRENT GOAL
                  </Text>
                </HStack>
                <Text fontSize="10px" color={colors.textSecondary} fontFamily="mono">
                  {state.actionCount}/{state.maxActions}
                </Text>
              </HStack>
              <Text fontSize="12px" color={colors.textPrimary} mb={2} lineHeight="1.4">
                {state.currentGoal}
              </Text>
              <Progress.Root value={progressPercent} size="xs">
                <Progress.Track bg={colors.border} borderRadius="full" h="3px">
                  <Progress.Range 
                    bg={`linear-gradient(90deg, ${colors.purple}, ${colors.cyan})`}
                    borderRadius="full"
                  />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}

          {/* AI Current Action - Simplified */}
          {state.currentThought && (
            <Box
              p={3}
              borderRadius="xl"
              background={colors.purpleGlow}
              border={`1px solid ${colors.purple}25`}
            >
              <HStack gap={2} align="start">
                <Box mt={0.5} flexShrink={0}>
                  <LuBrain size={14} color={colors.purple} />
                </Box>
                <Box flex={1} minW={0}>
                  <Text fontSize="10px" color={colors.purple} fontWeight="600" mb={1} letterSpacing="0.3px">
                    AI ACTION
                  </Text>
                  <Text 
                    fontSize="11px" 
                    color={colors.textSecondary} 
                    lineHeight="1.5"
                    wordBreak="break-word"
                    whiteSpace="pre-wrap"
                  >
                    {state.currentThought}
                  </Text>
                </Box>
              </HStack>
            </Box>
          )}

          {/* Advanced AI Reasoning - Collapsible */}
          {hasAIThinking && (
            <Box
              borderRadius="xl"
              background={colors.bgCard}
              border={`1px solid ${colors.border}`}
              overflow="hidden"
            >
              <Collapsible.Root open={showThinking} onOpenChange={(e) => setShowThinking(e.open)}>
                <Collapsible.Trigger asChild>
                  <HStack
                    justify="space-between"
                    p={3}
                    cursor="pointer"
                    _hover={{ background: colors.bgCardHover }}
                    transition="background 0.15s"
                  >
                    <HStack gap={2}>
                      <LuSparkles size={12} color={colors.cyan} />
                      <Text fontSize="11px" fontWeight="600" color={colors.textSecondary} letterSpacing="0.3px">
                        AI REASONING
                      </Text>
                    </HStack>
                    <Box color={colors.textMuted}>
                      {showThinking ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                    </Box>
                  </HStack>
                </Collapsible.Trigger>
                
                <Collapsible.Content>
                  <VStack gap={2} p={3} pt={0} align="stretch">
                    {/* Observation */}
                    {state.observation && (
                      <Box p={2.5} borderRadius="lg" bg={colors.bgGlass} border={`1px solid ${colors.border}`}>
                        <HStack gap={1.5} mb={1.5}>
                          <LuEye size={11} color={colors.blue} />
                          <Text fontSize="9px" color={colors.blue} fontWeight="600" letterSpacing="0.5px">
                            OBSERVATION
                          </Text>
                        </HStack>
                        <Text fontSize="11px" color={colors.textSecondary} lineHeight="1.4">
                          {state.observation}
                        </Text>
                      </Box>
                    )}

                    {/* Thinking Process */}
                    {state.thinking && (
                      <Box p={2.5} borderRadius="lg" bg={colors.bgGlass} border={`1px solid ${colors.border}`}>
                        <HStack gap={1.5} mb={1.5}>
                          <LuBrain size={11} color={colors.purple} />
                          <Text fontSize="9px" color={colors.purple} fontWeight="600" letterSpacing="0.5px">
                            THINKING
                          </Text>
                        </HStack>
                        <Text fontSize="11px" color={colors.textSecondary} lineHeight="1.4">
                          {state.thinking}
                        </Text>
                      </Box>
                    )}

                    {/* Next Step */}
                    {state.nextStep && (
                      <Box p={2.5} borderRadius="lg" bg={colors.bgGlass} border={`1px solid ${colors.border}`}>
                        <HStack gap={1.5} mb={1.5}>
                          <LuArrowRight size={11} color={colors.green} />
                          <Text fontSize="9px" color={colors.green} fontWeight="600" letterSpacing="0.5px">
                            NEXT STEP
                          </Text>
                        </HStack>
                        <Text fontSize="11px" color={colors.textSecondary} lineHeight="1.4">
                          {state.nextStep}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Collapsible.Content>
              </Collapsible.Root>
            </Box>
          )}

          {/* Error Display */}
          {state.lastError && (
            <Box
              p={3}
              borderRadius="xl"
              background={colors.redGlow}
              border={`1px solid ${colors.red}25`}
            >
              <HStack gap={2} align="start">
                <LuCircleX size={14} color={colors.red} style={{ flexShrink: 0, marginTop: 1 }} />
                <Text fontSize="11px" color={colors.red} lineHeight="1.4" wordBreak="break-word">
                  {state.lastError}
                </Text>
              </HStack>
            </Box>
          )}

          {/* Action History */}
          {state.actions.length > 0 && (
            <Box
              borderRadius="xl"
              background={colors.bgCard}
              border={`1px solid ${colors.border}`}
              overflow="hidden"
            >
              <Collapsible.Root open={showActions} onOpenChange={(e) => setShowActions(e.open)}>
                <Collapsible.Trigger asChild>
                  <HStack
                    justify="space-between"
                    p={3}
                    cursor="pointer"
                    _hover={{ background: colors.bgCardHover }}
                    transition="background 0.15s"
                  >
                    <HStack gap={2}>
                      <Text fontSize="11px" fontWeight="600" color={colors.textSecondary} letterSpacing="0.3px">
                        ACTION LOG
                      </Text>
                      <Box
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        bg={colors.purple}
                      >
                        <Text fontSize="9px" fontWeight="700" color="white">
                          {state.actions.length}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack gap={1}>
                      <IconButton
                        aria-label="Clear history"
                        size="xs"
                        variant="ghost"
                        color={colors.textMuted}
                        _hover={{ color: colors.red, bg: colors.redGlow }}
                        onClick={(e) => {
                          e.stopPropagation();
                          clearHistory();
                        }}
                      >
                        <LuTrash2 size={12} />
                      </IconButton>
                      <Box color={colors.textMuted}>
                        {showActions ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                      </Box>
                    </HStack>
                  </HStack>
                </Collapsible.Trigger>
                
                <Collapsible.Content>
                  <VStack
                    gap={1}
                    align="stretch"
                    p={2}
                    pt={0}
                    maxH="200px"
                    overflowY="auto"
                    css={{
                      '&::-webkit-scrollbar': { width: '3px' },
                      '&::-webkit-scrollbar-thumb': { background: colors.border, borderRadius: '3px' },
                    }}
                  >
                    {state.actions.slice().reverse().map((action, idx) => (
                      <Box
                        key={idx}
                        p={2}
                        px={2.5}
                        borderRadius="lg"
                        background={colors.bgGlass}
                        border={`1px solid ${colors.border}`}
                        transition="all 0.15s"
                        _hover={{ background: colors.bgCardHover }}
                      >
                        <HStack justify="space-between" mb={action.summary ? 1 : 0}>
                          <HStack gap={2}>
                            <Box 
                              p={1.5} 
                              borderRadius="md" 
                              bg={action.success ? colors.greenGlow : colors.redGlow}
                              color={action.success ? colors.green : colors.red}
                            >
                              {getActionIcon(action.action_type)}
                            </Box>
                            <Box>
                              <Text fontSize="11px" color={colors.textPrimary} fontWeight="500">
                                {action.action_type}
                              </Text>
                              <Text fontSize="9px" color={colors.textMuted} fontFamily="mono">
                                #{action.action_number}
                              </Text>
                            </Box>
                          </HStack>
                          <Box color={action.success ? colors.green : colors.red}>
                            {action.success ? (
                              <LuCircleCheck size={14} />
                            ) : (
                              <LuCircleX size={14} />
                            )}
                          </Box>
                        </HStack>
                        {action.summary && (
                          <Text fontSize="10px" color={colors.textMuted} mt={1} pl={7}>
                            {action.summary}
                          </Text>
                        )}
                        {action.error && (
                          <Text fontSize="10px" color={colors.red} mt={1} pl={7}>
                            {action.error}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                </Collapsible.Content>
              </Collapsible.Root>
            </Box>
          )}

          {/* Empty State */}
          {!state.currentGoal && state.actions.length === 0 && (
            <Box
              p={6}
              borderRadius="xl"
              background={colors.bgCard}
              border={`1px solid ${colors.border}`}
              textAlign="center"
            >
              <Box
                w={12}
                h={12}
                mx="auto"
                mb={3}
                borderRadius="2xl"
                background={`linear-gradient(135deg, ${colors.purpleGlow}, ${colors.cyanGlow})`}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <LuSparkles size={24} color={colors.purple} />
              </Box>
              <Text fontSize="sm" fontWeight="500" color={colors.textSecondary} mb={1}>
                Ready to Control
              </Text>
              <Text fontSize="11px" color={colors.textMuted} lineHeight="1.5" mb={3}>
                Enter a task above and I'll control your PC autonomously to complete it.
              </Text>
              <VStack gap={1} align="center">
                <Text fontSize="10px" color={colors.textMuted}>Examples:</Text>
                <Text fontSize="10px" color={colors.purple}>"Open Chrome and search for AI news"</Text>
                <Text fontSize="10px" color={colors.cyan}>"Create a new text file on desktop"</Text>
                <Text fontSize="10px" color={colors.green}>"Open Spotify and play music"</Text>
              </VStack>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
