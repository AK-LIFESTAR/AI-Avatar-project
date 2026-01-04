import { Box, Text, VStack, keyframes } from "@chakra-ui/react";
import { useState, useEffect } from "react";

const pulseKeyframes = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
`;

const spinKeyframes = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const progressKeyframes = keyframes`
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
`;

const dotKeyframes = keyframes`
  0%, 20% { opacity: 0; }
  40% { opacity: 1; }
  60%, 100% { opacity: 0; }
`;

interface BackendLoadingScreenProps {
  status?: 'connecting' | 'downloading' | 'starting' | 'ready';
  downloadProgress?: number;
}

export default function BackendLoadingScreen({ 
  status = 'connecting',
  downloadProgress 
}: BackendLoadingScreenProps): JSX.Element {
  const [dots, setDots] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);

  const loadingMessages = [
    "Starting AI engine...",
    "Preparing your assistant...",
    "Loading language models...",
    "Almost ready...",
  ];

  const downloadMessages = [
    "Downloading AI models (first launch only)...",
    "This may take a few minutes...",
    "Please keep the app open...",
    "Setting up your AI assistant...",
  ];

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % (status === 'downloading' ? downloadMessages.length : loadingMessages.length));
    }, 4000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(messageInterval);
    };
  }, [status]);

  const currentMessages = status === 'downloading' ? downloadMessages : loadingMessages;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0f0f17 100%)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={9999}
      overflow="hidden"
    >
      {/* Animated background orbs */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        width="600px"
        height="600px"
        borderRadius="50%"
        background="radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)"
        animation={`${pulseKeyframes} 4s ease-in-out infinite`}
      />
      <Box
        position="absolute"
        bottom="-15%"
        left="-5%"
        width="500px"
        height="500px"
        borderRadius="50%"
        background="radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)"
        animation={`${pulseKeyframes} 5s ease-in-out infinite 0.5s`}
      />
      <Box
        position="absolute"
        top="30%"
        left="20%"
        width="300px"
        height="300px"
        borderRadius="50%"
        background="radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)"
        animation={`${pulseKeyframes} 6s ease-in-out infinite 1s`}
      />

      <VStack gap={8} position="relative" zIndex={1}>
        {/* Logo/Brand area */}
        <VStack gap={2}>
          <Text
            fontSize="3xl"
            fontWeight="bold"
            bgGradient="to-r"
            gradientFrom="purple.400"
            gradientTo="cyan.400"
            bgClip="text"
            letterSpacing="wider"
          >
            Project A Prototype
          </Text>
          <Text
            fontSize="sm"
            color="whiteAlpha.600"
            letterSpacing="widest"
            textTransform="uppercase"
          >
            AI Avatar Assistant
          </Text>
        </VStack>

        {/* Loading spinner */}
        <Box position="relative" width="80px" height="80px">
          {/* Outer ring */}
          <Box
            position="absolute"
            inset={0}
            borderRadius="50%"
            border="3px solid"
            borderColor="whiteAlpha.100"
          />
          {/* Spinning gradient ring */}
          <Box
            position="absolute"
            inset={0}
            borderRadius="50%"
            border="3px solid transparent"
            borderTopColor="purple.500"
            borderRightColor="cyan.500"
            animation={`${spinKeyframes} 1.5s linear infinite`}
          />
          {/* Inner glow */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            width="50px"
            height="50px"
            borderRadius="50%"
            background="radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)"
            animation={`${pulseKeyframes} 2s ease-in-out infinite`}
          />
        </Box>

        {/* Progress bar for downloads */}
        {status === 'downloading' && (
          <Box width="280px">
            <Box
              height="4px"
              bg="whiteAlpha.100"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                height="100%"
                bg="linear-gradient(90deg, #8b5cf6, #06b6d4)"
                borderRadius="full"
                width={downloadProgress ? `${downloadProgress}%` : undefined}
                animation={downloadProgress ? undefined : `${progressKeyframes} 3s ease-in-out infinite`}
                transition="width 0.3s ease"
              />
            </Box>
            {downloadProgress !== undefined && (
              <Text
                fontSize="xs"
                color="whiteAlpha.600"
                textAlign="center"
                mt={2}
              >
                {downloadProgress}% complete
              </Text>
            )}
          </Box>
        )}

        {/* Status message */}
        <VStack gap={1}>
          <Text
            fontSize="md"
            color="whiteAlpha.800"
            fontWeight="medium"
          >
            {currentMessages[messageIndex]}{dots}
          </Text>
          {status === 'downloading' && (
            <Text
              fontSize="xs"
              color="whiteAlpha.500"
              textAlign="center"
              maxW="300px"
            >
              ⚡ First launch downloads ~1GB of AI models.
              <br />
              Subsequent launches are instant!
            </Text>
          )}
        </VStack>

        {/* Animated dots */}
        <Box display="flex" gap={2}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              width="8px"
              height="8px"
              borderRadius="50%"
              bg="linear-gradient(135deg, #8b5cf6, #06b6d4)"
              animation={`${dotKeyframes} 1.5s ease-in-out infinite ${i * 0.2}s`}
            />
          ))}
        </Box>
      </VStack>
    </Box>
  );
}

