import { useState, useEffect } from 'react';
import { Box, Flex, Text, Input, Button, VStack, HStack, Spinner, Switch } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSetup } from '@/context/setup-context';
import { FiKey, FiArrowRight, FiCheck, FiAlertCircle, FiEye, FiEyeOff, FiExternalLink, FiMonitor, FiShield } from 'react-icons/fi';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

// Premium color palette
const colors = {
  bgDeep: '#050508',
  bgPrimary: '#0a0a12',
  bgCard: 'rgba(255, 255, 255, 0.02)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  glassBorderHover: 'rgba(255, 255, 255, 0.12)',
  accentPrimary: '#8b5cf6',
  accentSecondary: '#06b6d4',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.35)',
  success: '#22c55e',
  error: '#ef4444',
  orange: '#f59e0b',
};

function OnboardingScreen() {
  const { 
    apiKey, 
    setApiKey, 
    pcControlEnabled, 
    setPcControlEnabled, 
    completeSetup, 
    isLoading, 
    error, 
    clearError 
  } = useSetup();
  const [showKey, setShowKey] = useState(false);
  const [step, setStep] = useState<'welcome' | 'api-key' | 'pc-control' | 'success'>('welcome');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-advance from welcome after animation
    const timer = setTimeout(() => {
      setStep('api-key');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleApiKeySubmit = () => {
    if (!apiKey || apiKey.trim().length < 20) {
      setLocalError('Please enter a valid OpenAI API key (starts with sk-)');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      setLocalError('OpenAI API keys start with "sk-"');
      return;
    }

    setLocalError(null);
    setStep('pc-control');
  };

  const handleFinalSubmit = async () => {
    const success = await completeSetup();
    if (success) {
      setStep('success');
    }
  };

  const displayError = localError || error;

  return (
    <Box
      position="fixed"
      inset={0}
      bg={colors.bgDeep}
      zIndex={9999}
      overflow="hidden"
    >
      {/* Animated Background Orbs */}
      <Box position="absolute" inset={0} overflow="hidden" pointerEvents="none">
        <MotionBox
          position="absolute"
          top="-20%"
          right="-10%"
          width="600px"
          height="600px"
          borderRadius="50%"
          bg={colors.accentPrimary}
          filter="blur(150px)"
          opacity={0.15}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.2, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <MotionBox
          position="absolute"
          bottom="-20%"
          left="-10%"
          width="500px"
          height="500px"
          borderRadius="50%"
          bg={colors.accentSecondary}
          filter="blur(150px)"
          opacity={0.1}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </Box>

      {/* Content */}
      <Flex
        position="relative"
        height="100%"
        alignItems="center"
        justifyContent="center"
        padding={8}
      >
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {step === 'welcome' && (
            <MotionFlex
              key="welcome"
              direction="column"
              alignItems="center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo/Brand */}
              <MotionBox
                mb={6}
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Box
                  width="100px"
                  height="100px"
                  borderRadius="24px"
                  bg="linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 0 60px rgba(139, 92, 246, 0.4)"
                >
                  <Text fontSize="3xl" fontWeight="bold" color="white">
                    A
                  </Text>
                </Box>
              </MotionBox>

              <Text
                fontSize="4xl"
                fontWeight="700"
                bgGradient="linear(to-r, #8b5cf6, #06b6d4)"
                bgClip="text"
                mb={3}
              >
                Project A Prototype
              </Text>
              <Text
                fontSize="lg"
                color={colors.textSecondary}
                textAlign="center"
              >
                Your AI-powered avatar companion
              </Text>

              <MotionBox
                mt={8}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Spinner size="sm" color={colors.accentPrimary} />
              </MotionBox>
            </MotionFlex>
          )}

          {/* API Key Setup */}
          {step === 'api-key' && (
            <MotionBox
              key="api-key"
              width="100%"
              maxW="500px"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Progress indicator */}
              <HStack justify="center" mb={6} gap={2}>
                <Box w="24px" h="3px" borderRadius="full" bg={colors.accentPrimary} />
                <Box w="24px" h="3px" borderRadius="full" bg={colors.glassBorder} />
              </HStack>

              {/* Card */}
              <Box
                bg={colors.bgCard}
                borderRadius="24px"
                border="1px solid"
                borderColor={colors.glassBorder}
                p={10}
                backdropFilter="blur(20px)"
              >
                {/* Header */}
                <VStack gap={2} mb={8} textAlign="center">
                  <Box
                    p={4}
                    borderRadius="16px"
                    bg="linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)"
                    border="1px solid"
                    borderColor="rgba(139, 92, 246, 0.2)"
                    mb={2}
                  >
                    <FiKey size={28} color={colors.accentPrimary} />
                  </Box>
                  <Text
                    fontSize="2xl"
                    fontWeight="700"
                    color={colors.textPrimary}
                  >
                    Connect Your AI
                  </Text>
                  <Text
                    fontSize="sm"
                    color={colors.textSecondary}
                    maxW="320px"
                  >
                    Enter your OpenAI API key to bring your avatar to life
                  </Text>
                </VStack>

                {/* Input */}
                <VStack gap={4}>
                  <Box width="100%" position="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder="sk-proj-..."
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setLocalError(null);
                        clearError();
                      }}
                      bg="rgba(0, 0, 0, 0.3)"
                      border="1px solid"
                      borderColor={displayError ? colors.error : colors.glassBorder}
                      borderRadius="12px"
                      height="56px"
                      px={5}
                      pr="50px"
                      fontSize="md"
                      color={colors.textPrimary}
                      _placeholder={{ color: colors.textMuted }}
                      _hover={{
                        borderColor: displayError ? colors.error : colors.glassBorderHover,
                      }}
                      _focus={{
                        borderColor: displayError ? colors.error : colors.accentPrimary,
                        boxShadow: displayError 
                          ? `0 0 0 1px ${colors.error}` 
                          : `0 0 0 1px ${colors.accentPrimary}`,
                        outline: 'none',
                      }}
                      transition="all 0.2s"
                    />
                    <Box
                      position="absolute"
                      right="16px"
                      top="50%"
                      transform="translateY(-50%)"
                      cursor="pointer"
                      color={colors.textMuted}
                      _hover={{ color: colors.textSecondary }}
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </Box>
                  </Box>

                  {/* Error Message */}
                  {displayError && (
                    <HStack gap={2} color={colors.error} fontSize="sm">
                      <FiAlertCircle size={14} />
                      <Text>{displayError}</Text>
                    </HStack>
                  )}

                  {/* Submit Button */}
                  <Button
                    width="100%"
                    height="56px"
                    bg="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
                    color="white"
                    borderRadius="12px"
                    fontSize="md"
                    fontWeight="600"
                    onClick={handleApiKeySubmit}
                    disabled={!apiKey}
                    _hover={{
                      bg: 'linear-gradient(135deg, #9d71fb 0%, #7c3aed 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
                    }}
                    _active={{
                      transform: 'translateY(0)',
                    }}
                    _disabled={{
                      opacity: 0.5,
                      cursor: 'not-allowed',
                      _hover: { transform: 'none', boxShadow: 'none' },
                    }}
                    transition="all 0.2s"
                  >
                    <HStack gap={2}>
                      <Text>Continue</Text>
                      <FiArrowRight />
                    </HStack>
                  </Button>
                </VStack>

                {/* Help Link */}
                <Box mt={6} textAlign="center">
                  <Text fontSize="xs" color={colors.textMuted} mb={2}>
                    Don't have an API key?
                  </Text>
                  <Button
                    as="a"
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="ghost"
                    size="sm"
                    color={colors.accentSecondary}
                    fontSize="xs"
                    fontWeight="500"
                    _hover={{
                      color: colors.textPrimary,
                      bg: 'rgba(6, 182, 212, 0.1)',
                    }}
                    rightIcon={<FiExternalLink size={12} />}
                  >
                    Get one from OpenAI
                  </Button>
                </Box>
              </Box>

              {/* Footer Note */}
              <Text
                mt={6}
                fontSize="xs"
                color={colors.textMuted}
                textAlign="center"
                px={4}
              >
                Your API key is stored securely on your device and never shared.
              </Text>
            </MotionBox>
          )}

          {/* PC Control Setup */}
          {step === 'pc-control' && (
            <MotionBox
              key="pc-control"
              width="100%"
              maxW="500px"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Progress indicator */}
              <HStack justify="center" mb={6} gap={2}>
                <Box w="24px" h="3px" borderRadius="full" bg={colors.accentPrimary} />
                <Box w="24px" h="3px" borderRadius="full" bg={colors.accentPrimary} />
              </HStack>

              {/* Card */}
              <Box
                bg={colors.bgCard}
                borderRadius="24px"
                border="1px solid"
                borderColor={colors.glassBorder}
                p={10}
                backdropFilter="blur(20px)"
              >
                {/* Header */}
                <VStack gap={2} mb={6} textAlign="center">
                  <Box
                    p={4}
                    borderRadius="16px"
                    bg="linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)"
                    border="1px solid"
                    borderColor="rgba(6, 182, 212, 0.2)"
                    mb={2}
                  >
                    <FiMonitor size={28} color={colors.accentSecondary} />
                  </Box>
                  <Text
                    fontSize="2xl"
                    fontWeight="700"
                    color={colors.textPrimary}
                  >
                    PC Control
                  </Text>
                  <Text
                    fontSize="sm"
                    color={colors.textSecondary}
                    maxW="340px"
                  >
                    Let AI control your computer to complete tasks automatically
                  </Text>
                </VStack>

                {/* Toggle Card */}
                <Box
                  p={5}
                  borderRadius="16px"
                  bg={pcControlEnabled ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)'}
                  border="1px solid"
                  borderColor={pcControlEnabled ? 'rgba(6, 182, 212, 0.3)' : colors.glassBorder}
                  mb={4}
                  transition="all 0.3s"
                >
                  <Flex justify="space-between" align="center">
                    <VStack align="start" gap={1}>
                      <Text fontWeight="600" color={colors.textPrimary} fontSize="md">
                        Enable PC Control
                      </Text>
                      <Text fontSize="xs" color={colors.textSecondary}>
                        AI can control mouse & keyboard
                      </Text>
                    </VStack>
                    <Switch.Root
                      checked={pcControlEnabled}
                      onCheckedChange={(e) => setPcControlEnabled(e.checked)}
                      size="lg"
                    >
                      <Switch.HiddenInput />
                      <Switch.Control
                        bg={pcControlEnabled ? colors.accentSecondary : colors.glassBorder}
                        _hover={{
                          bg: pcControlEnabled ? '#0891b2' : colors.glassBorderHover,
                        }}
                      >
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </Flex>
                </Box>

                {/* Features list */}
                {pcControlEnabled && (
                  <MotionBox
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <VStack gap={3} mb={4}>
                      <HStack w="100%" gap={3} align="start">
                        <Box
                          p={2}
                          borderRadius="8px"
                          bg="rgba(34, 197, 94, 0.15)"
                        >
                          <FiCheck size={14} color={colors.success} />
                        </Box>
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" color={colors.textPrimary}>
                            Open apps, browse web, create files
                          </Text>
                          <Text fontSize="xs" color={colors.textMuted}>
                            AI sees your screen and acts like you
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack w="100%" gap={3} align="start">
                        <Box
                          p={2}
                          borderRadius="8px"
                          bg="rgba(245, 158, 11, 0.15)"
                        >
                          <FiShield size={14} color={colors.orange} />
                        </Box>
                        <VStack align="start" gap={0}>
                          <Text fontSize="sm" color={colors.textPrimary}>
                            Emergency stop: top-left corner
                          </Text>
                          <Text fontSize="xs" color={colors.textMuted}>
                            Move mouse to corner to stop instantly
                          </Text>
                        </VStack>
                      </HStack>
                    </VStack>
                  </MotionBox>
                )}

                {/* Submit Button */}
                <Button
                  width="100%"
                  height="56px"
                  bg="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
                  color="white"
                  borderRadius="12px"
                  fontSize="md"
                  fontWeight="600"
                  onClick={handleFinalSubmit}
                  disabled={isLoading}
                  _hover={{
                    bg: 'linear-gradient(135deg, #9d71fb 0%, #7c3aed 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
                  }}
                  _active={{
                    transform: 'translateY(0)',
                  }}
                  _disabled={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    _hover: { transform: 'none', boxShadow: 'none' },
                  }}
                  transition="all 0.2s"
                >
                  {isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <HStack gap={2}>
                      <Text>Get Started</Text>
                      <FiArrowRight />
                    </HStack>
                  )}
                </Button>

                {/* Skip option */}
                <Text
                  mt={4}
                  fontSize="xs"
                  color={colors.textMuted}
                  textAlign="center"
                >
                  You can change this anytime in Settings
                </Text>
              </Box>
            </MotionBox>
          )}

          {/* Success Screen */}
          {step === 'success' && (
            <MotionFlex
              key="success"
              direction="column"
              alignItems="center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <MotionBox
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              >
                <Box
                  width="80px"
                  height="80px"
                  borderRadius="50%"
                  bg="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 0 40px rgba(34, 197, 94, 0.4)"
                  mb={6}
                >
                  <FiCheck size={40} color="white" />
                </Box>
              </MotionBox>

              <Text
                fontSize="2xl"
                fontWeight="700"
                color={colors.textPrimary}
                mb={2}
              >
                You're All Set!
              </Text>
              <Text
                fontSize="md"
                color={colors.textSecondary}
                textAlign="center"
                mb={2}
              >
                Your AI avatar is ready to chat
              </Text>
              {pcControlEnabled && (
                <Text
                  fontSize="sm"
                  color={colors.accentSecondary}
                  mb={6}
                >
                  🖥️ PC Control is enabled
                </Text>
              )}

              <MotionBox
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Text fontSize="sm" color={colors.textMuted}>
                  Loading your experience...
                </Text>
              </MotionBox>
            </MotionFlex>
          )}
        </AnimatePresence>
      </Flex>

      {/* Brand Footer */}
      <Box
        position="absolute"
        bottom={6}
        left="50%"
        transform="translateX(-50%)"
      >
        <Text
          fontSize="xs"
          color={colors.textMuted}
          fontWeight="500"
          letterSpacing="1px"
        >
          PROJECT A PROTOTYPE
        </Text>
      </Box>
    </Box>
  );
}

export default OnboardingScreen;
