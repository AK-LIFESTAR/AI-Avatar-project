// Premium Design System
const colors = {
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accentPrimary: '#8b5cf6',
  accentSecondary: '#06b6d4',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
};

export const canvasStyles = {
  background: {
    container: {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      pointerEvents: 'auto',
      // Transparent by default for realistic avatar feel
      background: 'transparent',
    },
    image: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: 1,
      opacity: 0.4, // Subtle background
    },
    video: {
      position: 'absolute' as const,
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      zIndex: 1,
      transform: 'scaleX(-1)' as const,
      opacity: 0.6,
    },
  },
  canvas: {
    container: {
      position: 'relative',
      width: '100%',
      height: '100%',
      zIndex: '1',
      pointerEvents: 'auto',
    },
  },
  subtitle: {
    container: {
      // Premium glassmorphism subtitle
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      padding: '16px 28px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      minWidth: '200px',
      maxWidth: '90%',
      animation: 'fadeInUp 0.3s ease-out',
    },
    text: {
      color: colors.textPrimary,
      fontSize: '1.35rem',
      textAlign: 'center',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
      fontWeight: '400',
      letterSpacing: '0.3px',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    },
  },
  // AI Inner Thoughts display
  innerThought: {
    container: {
      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '12px 20px',
      borderRadius: '12px',
      borderLeft: `3px solid ${colors.accentSecondary}`,
      border: '1px solid rgba(6, 182, 212, 0.2)',
      boxShadow: '0 4px 20px rgba(6, 182, 212, 0.15)',
      maxWidth: '80%',
      animation: 'fadeInUp 0.4s ease-out',
    },
    label: {
      fontSize: '0.7rem',
      color: colors.accentSecondary,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      fontWeight: '600',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    text: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '1rem',
      fontStyle: 'italic',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
    },
  },
  wsStatus: {
    container: {
      position: 'relative',
      zIndex: 2,
      padding: '10px 18px',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: '500',
      color: 'white',
      transition: 'all 0.25s ease',
      cursor: 'pointer',
      userSelect: 'none',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      _hover: {
        background: 'rgba(255, 255, 255, 0.08)',
        transform: 'translateY(-1px)',
      },
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      animation: 'pulse 2s ease-in-out infinite',
    },
    connected: {
      background: '#22c55e',
      boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
    },
    disconnected: {
      background: '#ef4444',
      boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
    },
    connecting: {
      background: '#f59e0b',
      boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)',
    },
  },
};
