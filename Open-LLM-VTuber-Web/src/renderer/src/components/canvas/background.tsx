import { Box, Image } from '@chakra-ui/react';
import { memo, useEffect, useRef } from 'react';
import { useCamera } from '@/context/camera-context';
import { useBgUrl } from '@/context/bgurl-context';

// Premium colors
const premiumColors = {
  bgDeep: '#0a0a0f',
  bgGradient: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
};

const Background = memo(({ children }: { children?: React.ReactNode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    backgroundStream, isBackgroundStreaming, startBackgroundCamera, stopBackgroundCamera,
  } = useCamera();
  const { useCameraBackground, backgroundUrl } = useBgUrl();

  useEffect(() => {
    if (useCameraBackground) {
      startBackgroundCamera();
    } else {
      stopBackgroundCamera();
    }
  }, [useCameraBackground, startBackgroundCamera, stopBackgroundCamera]);

  useEffect(() => {
    if (videoRef.current && backgroundStream) {
      videoRef.current.srcObject = backgroundStream;
    }
  }, [backgroundStream]);

  // Check if we should show transparent/minimal background
  const showTransparent = !useCameraBackground && !backgroundUrl;

  return (
    <Box
      position="relative"
      width="100%"
      height="100%"
      overflow="hidden"
      pointerEvents="auto"
      // Premium gradient background when no image/camera
      background={showTransparent ? premiumColors.bgGradient : 'transparent'}
    >
      {/* Ambient glow effect for transparent mode */}
      {showTransparent && (
        <>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            width="60%"
            height="60%"
            borderRadius="50%"
            background="radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)"
            filter="blur(60px)"
            pointerEvents="none"
          />
        </>
      )}
      
      {useCameraBackground ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            transform: 'scaleX(-1)',
            display: isBackgroundStreaming ? 'block' : 'none',
            opacity: 0.5, // Semi-transparent camera feed
            filter: 'brightness(0.7) saturate(0.8)',
          }}
        />
      ) : backgroundUrl ? (
        <Image
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          objectFit="cover"
          zIndex={1}
          opacity={0.35} // Subtle background image
          filter="brightness(0.6) saturate(0.7)"
          src={backgroundUrl}
          alt="background"
        />
      ) : null}
      
      {children}
    </Box>
  );
});

Background.displayName = 'Background';

export default Background;
