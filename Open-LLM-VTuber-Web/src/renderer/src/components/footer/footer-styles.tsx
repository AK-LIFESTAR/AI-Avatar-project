import { SystemStyleObject } from '@chakra-ui/react';

// Premium Design System
const colors = {
  bgDeep: '#0a0a0f',
  bgPrimary: '#12121a',
  bgSecondary: '#1a1a25',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBgHover: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accentPrimary: '#8b5cf6',
  accentPrimaryGlow: 'rgba(139, 92, 246, 0.4)',
  accentSecondary: '#06b6d4',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
};

interface FooterStyles {
  container: (isCollapsed: boolean) => SystemStyleObject
  toggleButton: SystemStyleObject
  actionButton: SystemStyleObject
  input: SystemStyleObject
  attachButton: SystemStyleObject
}

interface AIIndicatorStyles {
  container: SystemStyleObject
  text: SystemStyleObject
}

export const footerStyles: {
  footer: FooterStyles
  aiIndicator: AIIndicatorStyles
} = {
  footer: {
    container: (isCollapsed) => ({
      bg: isCollapsed ? 'transparent' : colors.bgPrimary,
      borderTop: isCollapsed ? 'none' : '1px solid',
      borderColor: colors.glassBorder,
      borderTopRadius: isCollapsed ? 'none' : '20px',
      transform: isCollapsed ? 'translateY(calc(100% - 24px))' : 'translateY(0)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      position: 'relative',
      overflow: isCollapsed ? 'visible' : 'hidden',
      pb: '4',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
    toggleButton: {
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: colors.textMuted,
      _hover: { 
        color: colors.textPrimary,
        transform: 'scale(1.1)',
      },
      bg: 'transparent',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    actionButton: {
      borderRadius: '14px',
      width: '52px',
      height: '52px',
      minW: '52px',
      bg: colors.glassBg,
      border: '1px solid',
      borderColor: colors.glassBorder,
      color: colors.textSecondary,
      _hover: {
        bg: colors.glassBgHover,
        borderColor: colors.accentPrimary,
        color: colors.accentPrimary,
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 25px ${colors.accentPrimaryGlow}`,
      },
      _active: {
        transform: 'translateY(0)',
        bg: colors.accentPrimary,
        color: 'white',
      },
      transition: 'all 0.25s ease',
    },
    input: {
      bg: colors.bgSecondary,
      border: '1px solid',
      borderColor: colors.glassBorder,
      height: '70px',
      borderRadius: '16px',
      fontSize: '16px',
      pl: '14',
      pr: '4',
      color: colors.textPrimary,
      _placeholder: {
        color: colors.textMuted,
      },
      _focus: {
        borderColor: colors.accentPrimary,
        boxShadow: `0 0 0 3px ${colors.accentPrimaryGlow}`,
        bg: colors.bgSecondary,
      },
      _hover: {
        borderColor: 'rgba(255, 255, 255, 0.15)',
      },
      resize: 'none',
      minHeight: '70px',
      maxHeight: '70px',
      py: '0',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '24px',
      lineHeight: '1.4',
      transition: 'all 0.25s ease',
    },
    attachButton: {
      position: 'absolute',
      left: '2',
      top: '50%',
      transform: 'translateY(-50%)',
      color: colors.textMuted,
      zIndex: 2,
      borderRadius: '10px',
      _hover: {
        bg: colors.glassBgHover,
        color: colors.accentPrimary,
      },
      transition: 'all 0.2s ease',
    },
  },
  aiIndicator: {
    container: {
      // Premium gradient indicator
      background: `linear-gradient(135deg, ${colors.accentPrimary} 0%, ${colors.accentSecondary} 100%)`,
      color: 'white',
      minWidth: '120px',
      height: '34px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: `0 4px 15px ${colors.accentPrimaryGlow}`,
      overflow: 'hidden',
      padding: '0 16px',
      fontWeight: '500',
      letterSpacing: '0.3px',
    },
    text: {
      fontSize: '12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontWeight: '500',
    },
  },
};
