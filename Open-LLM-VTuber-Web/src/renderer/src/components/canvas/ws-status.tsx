import { Box, Text, Flex } from '@chakra-ui/react';
import { memo } from 'react';
import { useWSStatus } from '@/hooks/canvas/use-ws-status';
import { useTranslation } from 'react-i18next';

// Premium status colors
const statusColors = {
  connected: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.3)',
    dot: '#22c55e',
    glow: '0 0 12px rgba(34, 197, 94, 0.5)',
    text: 'rgba(34, 197, 94, 0.9)',
  },
  disconnected: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
    dot: '#ef4444',
    glow: '0 0 12px rgba(239, 68, 68, 0.5)',
    text: 'rgba(239, 68, 68, 0.9)',
  },
  connecting: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
    dot: '#f59e0b',
    glow: '0 0 12px rgba(245, 158, 11, 0.5)',
    text: 'rgba(245, 158, 11, 0.9)',
  },
};

const WebSocketStatus = memo((): JSX.Element => {
  const { textKey, isDisconnected, handleClick } = useWSStatus();
  const { t } = useTranslation();

  // Determine status based on textKey
  const isConnecting = textKey === 'wsStatus.connecting';
  const isConnected = textKey === 'wsStatus.connected';
  
  const status = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected';
  const colors = statusColors[status];
  
  const statusText = t(textKey, isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Click to reconnect');

  return (
    <Box
      as="button"
      onClick={handleClick}
      cursor={isDisconnected ? 'pointer' : 'default'}
      background={colors.bg}
      border="1px solid"
      borderColor={colors.border}
      borderRadius="14px"
      padding="10px 18px"
      backdropFilter="blur(12px)"
      WebkitBackdropFilter="blur(12px)"
      transition="all 0.25s ease"
      _hover={{
        transform: isDisconnected ? 'translateY(-2px)' : 'none',
        boxShadow: isDisconnected ? colors.glow : 'none',
      }}
      _active={{
        transform: 'translateY(0)',
      }}
    >
      <Flex align="center" gap="10px">
        {/* Status Dot */}
        <Box
          width="8px"
          height="8px"
          borderRadius="50%"
          background={colors.dot}
          boxShadow={colors.glow}
          animation={isConnecting ? 'pulse 1.5s ease-in-out infinite' : 'none'}
          css={{
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(1.3)' },
            },
          }}
        />
        
        {/* Status Text */}
        <Text
          fontSize="13px"
          fontWeight="500"
          color={colors.text}
          letterSpacing="0.3px"
        >
          {statusText}
        </Text>
      </Flex>
    </Box>
  );
});

WebSocketStatus.displayName = 'WebSocketStatus';

export default WebSocketStatus;
