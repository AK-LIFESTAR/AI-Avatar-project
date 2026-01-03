import {
  LuBell, LuSend, LuMic, LuMicOff, LuHand, LuX, LuMousePointer2, LuSquare, LuPlay,
} from 'react-icons/lu';
import {
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Text,
  VStack,
  IconButton,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { useInputSubtitle } from '@/hooks/electron/use-input-subtitle';
import { useDraggable } from '@/hooks/electron/use-draggable';
import { inputSubtitleStyles } from './electron-style';
import { useMode } from '@/context/mode-context';
import { useComputerUse } from '@/context/computer-use-context';
import { useWebSocket } from '@/context/websocket-context';

export function InputSubtitle() {
  const {
    inputValue,
    handleInputChange,
    handleKeyPress,
    handleCompositionStart,
    handleCompositionEnd,
    handleInterrupt,
    handleMicToggle,
    handleSend,
    lastAIMessage,
    hasAIMessages,
    aiState,
    micOn,
  } = useInputSubtitle();

  const { mode } = useMode();
  const isPet = mode === 'pet';
  
  // Computer Use integration
  const { state: computerUseState, startSession, stopSession } = useComputerUse();
  const { sendMessage } = useWebSocket();
  const [computerUseMode, setComputerUseMode] = useState(false);

  const {
    elementRef,
    isDragging,
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
  } = useDraggable({
    componentId: 'input-subtitle',
  });

  const [isVisible, setIsVisible] = useState(true);

  const handleClose = useCallback(() => {
    if (isPet) {
      (window.api as any)?.updateComponentHover('input-subtitle', false);
    }
    setIsVisible(false);
  }, [isPet]);

  const handleOpen = () => {
    setIsVisible(true);
  };

  useEffect(() => {
    if (isPet) {
      const cleanup = (window.api as any)?.onToggleInputSubtitle(() => {
        if (isVisible) {
          handleClose();
        } else {
          handleOpen();
        }
      });
      return () => cleanup?.();
    }
    return () => {};
  }, [handleClose, isPet, isVisible]);

  useEffect(() => {
    (window as any).inputSubtitle = {
      open: handleOpen,
      close: handleClose,
    };

    return () => {
      delete (window as any).inputSubtitle;
    };
  }, [isPet, handleClose]);

  if (!isVisible) return null;

  return (
    <Box
      ref={elementRef}
      {...inputSubtitleStyles.container}
      {...inputSubtitleStyles.draggableContainer(isDragging)}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Box {...inputSubtitleStyles.box}>
        <IconButton
          aria-label="Close subtitle"
          onClick={handleClose}
          {...inputSubtitleStyles.closeButton}
        >
          <LuX size={12} />
        </IconButton>

        {hasAIMessages && (
          <VStack
            minH={lastAIMessage ? '32px' : '0px'}
            {...inputSubtitleStyles.messageStack}
          >
            {lastAIMessage && (
              <Text {...inputSubtitleStyles.messageText}>
                {lastAIMessage}
              </Text>
            )}
          </VStack>
        )}

        <Box {...inputSubtitleStyles.statusBox}>
          <Flex align="center" justify="space-between" color="whiteAlpha.700">
            <Flex align="center" gap="2">
              <LuBell size={16} />
              <Text {...inputSubtitleStyles.statusText}>
                {aiState}
              </Text>
            </Flex>

            <Flex gap="2">
              <IconButton
                aria-label="Toggle microphone"
                onClick={handleMicToggle}
                {...inputSubtitleStyles.iconButton}
              >
                {micOn ? <LuMic size={16} /> : <LuMicOff size={16} />}
              </IconButton>
              <IconButton
                aria-label="Interrupt"
                onClick={handleInterrupt}
                {...inputSubtitleStyles.iconButton}
              >
                <LuHand size={16} />
              </IconButton>
            </Flex>
          </Flex>
        </Box>

        {/* Computer Use Mode Toggle */}
        <HStack px="2" py="1" justify="space-between">
          <HStack gap="1">
            <IconButton
              aria-label="Toggle Computer Use Mode"
              onClick={() => setComputerUseMode(!computerUseMode)}
              size="xs"
              variant={computerUseMode ? "solid" : "ghost"}
              colorPalette={computerUseMode ? "purple" : "gray"}
            >
              <LuMousePointer2 size={14} />
            </IconButton>
            {computerUseMode && (
              <Badge 
                size="sm" 
                colorPalette={computerUseState.isRunning ? "green" : "gray"}
              >
                {computerUseState.isRunning ? "Active" : "PC Control"}
              </Badge>
            )}
          </HStack>
          {computerUseState.isRunning && (
            <Text fontSize="10px" color="whiteAlpha.600">
              Action #{computerUseState.actionCount}
            </Text>
          )}
        </HStack>

        <Box {...inputSubtitleStyles.inputBox}>
          <Stack direction="row" gap="2" p="2">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (computerUseMode && e.key === 'Enter' && inputValue.trim()) {
                  e.preventDefault();
                  if (computerUseState.isRunning) {
                    sendMessage({ type: 'computer-use-stop' });
                    stopSession();
                  } else {
                    sendMessage({ type: 'computer-use-start', goal: inputValue.trim() });
                    startSession(inputValue.trim());
                  }
                } else {
                  handleKeyPress(e);
                }
              }}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder={computerUseMode ? "Enter a task for AI to do on your PC..." : "Type your message..."}
              {...inputSubtitleStyles.input}
            />
            <Button
              onClick={() => {
                if (computerUseMode) {
                  if (computerUseState.isRunning) {
                    sendMessage({ type: 'computer-use-stop' });
                    stopSession();
                  } else if (inputValue.trim()) {
                    sendMessage({ type: 'computer-use-start', goal: inputValue.trim() });
                    startSession(inputValue.trim());
                  }
                } else {
                  handleSend();
                }
              }}
              {...inputSubtitleStyles.sendButton}
              colorPalette={computerUseMode ? (computerUseState.isRunning ? "red" : "purple") : undefined}
            >
              {computerUseMode ? (
                computerUseState.isRunning ? <LuSquare size={16} /> : <LuPlay size={16} />
              ) : (
                <LuSend size={16} />
              )}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
