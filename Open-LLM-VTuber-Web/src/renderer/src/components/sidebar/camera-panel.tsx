import { useEffect, useState, useCallback } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { FiCamera, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/ui/tooltip';
import { sidebarStyles } from './sidebar-styles';
import { useCameraPanel } from '@/hooks/sidebar/use-camera-panel';

// Premium colors
const colors = {
  accentPrimary: '#8b5cf6',
  accentSecondary: '#06b6d4',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  success: '#22c55e',
  warning: '#f59e0b',
};

// Reusable components
function LiveIndicator({ isReady }: { isReady: boolean }) {
  const { t } = useTranslation();

  return (
    <Flex alignItems="center" gap={2}>
      <Box 
        w="8px" 
        h="8px" 
        borderRadius="full" 
        bg={isReady ? colors.success : colors.warning}
        boxShadow={isReady ? `0 0 8px ${colors.success}` : `0 0 8px ${colors.warning}`}
        animation="pulse 2s infinite" 
      />
      <Text 
        fontSize="xs" 
        fontWeight="600"
        color={isReady ? colors.success : colors.warning}
        textTransform="uppercase"
        letterSpacing="0.05em"
      >
        {isReady ? 'READY' : 'LOADING'}
      </Text>
    </Flex>
  );
}

function VisionStatus({ isActive }: { isActive: boolean }) {
  return (
    <Flex 
      alignItems="center" 
      gap={1.5}
      px={2}
      py={1}
      borderRadius="full"
      bg={isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)'}
      border="1px solid"
      borderColor={isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}
    >
      {isActive ? (
        <FiEye size={12} color={colors.success} />
      ) : (
        <FiEyeOff size={12} color="rgba(255,255,255,0.4)" />
      )}
      <Text 
        fontSize="10px" 
        fontWeight="500"
        color={isActive ? colors.success : 'rgba(255,255,255,0.4)'}
      >
        {isActive ? 'AI Can See' : 'Vision Off'}
      </Text>
    </Flex>
  );
}

function CameraPlaceholder() {
  const { t } = useTranslation();

  return (
    <Box
      position="absolute"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={3}
      p={4}
      textAlign="center"
    >
      <Box
        p={3}
        borderRadius="xl"
        bg="linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)"
        border="1px solid rgba(139, 92, 246, 0.3)"
    >
        <FiCamera size={28} color={colors.accentPrimary} />
      </Box>
      <Box>
        <Text color="whiteAlpha.800" fontSize="sm" fontWeight="500" mb={1}>
          Enable Camera
        </Text>
        <Text color="whiteAlpha.500" fontSize="xs" lineHeight="1.4">
          Click to start camera.<br />
          AI will see what you show.
      </Text>
      </Box>
    </Box>
  );
}

function VideoStream({
  videoRef,
  isStreaming,
}: {
  videoRef: React.RefObject<HTMLVideoElement>
  isStreaming: boolean
}) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        ...sidebarStyles.cameraPanel.video,
        display: isStreaming ? 'block' : 'none',
        borderRadius: '8px',
      }}
    />
  );
}

// Main component
function CameraPanel(): JSX.Element {
  const { t } = useTranslation();
  const {
    videoRef,
    error,
    isHovering,
    isStreaming,
    stream,
    toggleCamera,
    handleMouseEnter,
    handleMouseLeave,
  } = useCameraPanel();

  // Track if camera stream is ready (has frames)
  const [isReady, setIsReady] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  // Check if camera is producing frames
  useEffect(() => {
    if (isStreaming && stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Wait a brief moment for frames to be available
        const timer = setTimeout(() => {
          setIsReady(true);
          setFrameCount((prev) => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      setIsReady(false);
      setFrameCount(0);
    }
  }, [isStreaming, stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Box 
      p={3}
      bg={colors.glassBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={colors.glassBorder}
    >
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="center" mb={3}>
        {isStreaming ? (
          <LiveIndicator isReady={isReady} />
        ) : (
          <Box h="20px" />
        )}
        <VisionStatus isActive={isStreaming && isReady} />
      </Flex>

      {/* Video Container */}
      <Tooltip
        showArrow
        content={isStreaming ? 'Click to stop camera' : 'Click to start camera for AI vision'}
        open={isHovering && !error}
      >
        <Box
          position="relative"
          height="160px"
          borderRadius="lg"
          overflow="hidden"
          bg="rgba(0, 0, 0, 0.4)"
          border="1px solid"
          borderColor={isStreaming ? (isReady ? colors.success : colors.warning) : 'rgba(255,255,255,0.1)'}
          boxShadow={isStreaming && isReady ? `0 0 20px rgba(34, 197, 94, 0.2)` : 'none'}
          onClick={toggleCamera}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          cursor="pointer"
          transition="all 0.3s ease"
          _hover={{
            borderColor: isStreaming ? colors.success : colors.accentPrimary,
            boxShadow: isStreaming 
              ? `0 0 25px rgba(34, 197, 94, 0.3)` 
              : `0 0 20px rgba(139, 92, 246, 0.2)`,
          }}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {error ? (
            <Text color="red.300" fontSize="sm" textAlign="center" px={4}>
              {error}
            </Text>
          ) : (
            <>
              <VideoStream videoRef={videoRef} isStreaming={isStreaming} />
              {!isStreaming && <CameraPlaceholder />}
            </>
          )}
        </Box>
      </Tooltip>

      {/* Hint */}
      {isStreaming && isReady && (
        <Box mt={2}>
          <Text 
            fontSize="10px" 
            color="rgba(255,255,255,0.5)" 
            textAlign="center"
            fontStyle="italic"
          >
            AI can now see. Ask "What do you see?"
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default CameraPanel;
