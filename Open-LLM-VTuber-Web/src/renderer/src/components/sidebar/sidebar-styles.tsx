import { css } from '@emotion/react';

const isElectron = window.api !== undefined;

// Premium Design System
const colors = {
  bgDeep: '#0a0a0f',
  bgPrimary: '#12121a',
  bgSecondary: '#1a1a25',
  bgElevated: '#222230',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBgHover: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderHover: 'rgba(255, 255, 255, 0.15)',
  accentPrimary: '#8b5cf6',
  accentPrimaryGlow: 'rgba(139, 92, 246, 0.4)',
  accentSecondary: '#06b6d4',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
};

const commonStyles = {
  scrollbar: {
    '&::-webkit-scrollbar': {
      width: '5px',
    },
    '&::-webkit-scrollbar-track': {
      bg: 'transparent',
      borderRadius: 'full',
    },
    '&::-webkit-scrollbar-thumb': {
      bg: colors.glassBorder,
      borderRadius: 'full',
      transition: 'all 0.2s',
      '&:hover': {
        bg: colors.glassBorderHover,
      },
    },
  },
  panel: {
    border: '1px solid',
    borderColor: colors.glassBorder,
    borderRadius: '16px',
    bg: colors.glassBg,
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: 'md',
    fontWeight: '600',
    color: colors.textPrimary,
    mb: 4,
    letterSpacing: '0.3px',
  },
};

export const sidebarStyles = {
  sidebar: {
    container: (isCollapsed: boolean) => ({
      position: 'absolute' as const,
      left: 0,
      top: 0,
      height: '100%',
      width: '380px',
      bg: colors.bgPrimary,
      transform: isCollapsed
        ? 'translateX(calc(-100% + 24px))'
        : 'translateX(0)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 4,
      overflow: isCollapsed ? 'visible' : 'hidden',
      pb: '4',
      borderRight: '1px solid',
      borderColor: colors.glassBorder,
    }),
    toggleButton: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: '24px',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: colors.textMuted,
      _hover: { 
        color: colors.textPrimary,
        bg: colors.glassBgHover,
      },
      bg: 'transparent',
      transition: 'all 0.25s ease',
      zIndex: 1,
    },
    content: {
      flex: 1,
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 4,
      overflow: 'hidden',
    },
    header: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 3,
      borderBottom: '1px solid',
      borderColor: colors.glassBorder,
    },
  },

  chatHistoryPanel: {
    container: {
      flex: 1,
      overflow: 'hidden',
      px: 4,
      display: 'flex',
      flexDirection: 'column',
    },
    title: commonStyles.title,
    messageList: {
      ...commonStyles.panel,
      p: 4,
      width: '100%',
      flex: 1,
      overflowY: 'auto',
      css: {
        ...commonStyles.scrollbar,
        scrollPaddingBottom: '1rem',
      },
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    },
  },

  systemLogPanel: {
    container: {
      width: '100%',
      overflow: 'hidden',
      px: 4,
      minH: '180px',
      marginTop: 'auto',
    },
    title: commonStyles.title,
    logList: {
      ...commonStyles.panel,
      p: 4,
      height: '180px',
      overflowY: 'auto',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      css: commonStyles.scrollbar,
    },
    entry: {
      p: 2,
      borderRadius: '10px',
      _hover: {
        bg: colors.glassBgHover,
      },
      transition: 'all 0.15s ease',
    },
  },

  chatBubble: {
    container: {
      display: 'flex',
      position: 'relative',
      _hover: {
        bg: colors.glassBgHover,
      },
      py: 2,
      px: 3,
      borderRadius: '12px',
      transition: 'all 0.2s ease',
    },
    message: {
      maxW: '90%',
      bg: 'transparent',
      p: 2,
    },
    text: {
      fontSize: 'sm',
      color: colors.textPrimary,
      lineHeight: '1.5',
    },
    dot: {
      position: 'absolute',
      w: '2',
      h: '2',
      borderRadius: 'full',
      bg: colors.accentPrimary,
      top: '3',
      boxShadow: `0 0 8px ${colors.accentPrimaryGlow}`,
    },
  },

  historyDrawer: {
    listContainer: {
      flex: 1,
      overflowY: 'auto',
      px: 4,
      py: 3,
      css: commonStyles.scrollbar,
    },
    historyItem: {
      mb: 3,
      p: 4,
      borderRadius: '14px',
      bg: colors.glassBg,
      border: '1px solid',
      borderColor: colors.glassBorder,
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      _hover: {
        bg: colors.glassBgHover,
        borderColor: colors.glassBorderHover,
        transform: 'translateX(4px)',
      },
    },
    historyItemSelected: {
      bg: `linear-gradient(135deg, ${colors.accentPrimary}15 0%, ${colors.accentSecondary}10 100%)`,
      borderColor: colors.accentPrimary,
      borderLeft: '3px solid',
      boxShadow: `0 4px 20px ${colors.accentPrimaryGlow}`,
    },
    historyHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 2,
    },
    timestamp: {
      fontSize: 'xs',
      color: colors.textMuted,
      fontFamily: "'JetBrains Mono', monospace",
    },
    deleteButton: {
      variant: 'ghost' as const,
      colorScheme: 'red' as const,
      size: 'sm' as const,
      color: '#ef4444',
      opacity: 0.7,
      borderRadius: '10px',
      _hover: {
        opacity: 1,
        bg: 'rgba(239, 68, 68, 0.1)',
      },
      transition: 'all 0.2s ease',
    },
    messagePreview: {
      fontSize: 'sm',
      color: colors.textSecondary,
      noOfLines: 2,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: '1.5',
    },
    drawer: {
      content: {
        background: colors.bgPrimary,
        maxWidth: '380px',
        marginTop: isElectron ? '30px' : '0',
        height: isElectron ? 'calc(100vh - 30px)' : '100vh',
        borderRight: '1px solid',
        borderColor: colors.glassBorder,
      },
      title: {
        color: colors.textPrimary,
        fontWeight: '600',
        letterSpacing: '0.3px',
      },
      closeButton: {
        color: colors.textSecondary,
        _hover: {
          color: colors.textPrimary,
          bg: colors.glassBgHover,
        },
      },
      actionButton: {
        color: colors.textPrimary,
        borderColor: colors.glassBorder,
        variant: 'outline' as const,
        borderRadius: '12px',
        _hover: {
          borderColor: colors.accentPrimary,
          color: colors.accentPrimary,
        },
      },
    },
  },

  cameraPanel: {
    container: {
      width: '100%',
      overflow: 'hidden',
      px: 4,
      minH: '220px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 4,
    },
    title: commonStyles.title,
    videoContainer: {
      ...commonStyles.panel,
      width: '100%',
      height: '220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      transition: 'all 0.25s ease',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      transform: 'scaleX(-1)',
      borderRadius: '14px',
      display: 'block',
    } as const,
  },

  screenPanel: {
    container: {
      width: '100%',
      overflow: 'hidden',
      px: 4,
      minH: '220px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 4,
    },
    title: commonStyles.title,
    screenContainer: {
      ...commonStyles.panel,
      width: '100%',
      height: '220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      transition: 'all 0.25s ease',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      borderRadius: '14px',
      display: 'block',
    } as const,
  },

  browserPanel: {
    container: {
      width: '100%',
      overflow: 'hidden',
      px: 4,
      minH: '220px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 4,
    },
    title: commonStyles.title,
    browserContainer: {
      ...commonStyles.panel,
      width: '100%',
      height: '220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      transition: 'all 0.25s ease',
      cursor: 'pointer',
      _hover: {
        bg: colors.glassBgHover,
        borderColor: colors.glassBorderHover,
      },
    },
    iframe: {
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: '14px',
    } as const,
  },

  bottomTab: {
    container: {
      width: '100%',
      px: 2,
      position: 'relative' as const,
      zIndex: 0,
    },
    tabs: {
      width: '100%',
      bg: colors.glassBg,
      borderRadius: '14px',
      p: '1',
      border: '1px solid',
      borderColor: colors.glassBorder,
    },
    list: {
      borderBottom: 'none',
      gap: '1',
      display: 'flex',
      flexWrap: 'nowrap' as const,
      overflowX: 'auto' as const,
      overflowY: 'hidden' as const,
      scrollbarWidth: 'none' as const,
      msOverflowStyle: 'none' as const,
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      pb: '1',
    },
    trigger: {
      color: colors.textMuted,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      px: 2.5,
      py: 2,
      borderRadius: '8px',
      fontWeight: '500',
      fontSize: 'xs',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
      minW: 'auto',
      _hover: {
        color: colors.textSecondary,
        bg: colors.glassBgHover,
      },
      _selected: {
        color: colors.textPrimary,
        bg: `linear-gradient(135deg, ${colors.accentPrimary}20 0%, ${colors.accentSecondary}15 100%)`,
        boxShadow: `0 2px 10px ${colors.accentPrimaryGlow}`,
      },
    },
  },

  groupDrawer: {
    section: {
      mb: 6,
    },
    sectionTitle: {
      fontSize: 'md',
      fontWeight: '600',
      color: colors.textPrimary,
      mb: 3,
      letterSpacing: '0.3px',
    },
    inviteBox: {
      display: 'flex',
      gap: 2,
    },
    input: {
      bg: colors.bgSecondary,
      border: '1px solid',
      borderColor: colors.glassBorder,
      color: colors.textPrimary,
      borderRadius: '12px',
      _placeholder: {
        color: colors.textMuted,
      },
      _focus: {
        borderColor: colors.accentPrimary,
        boxShadow: `0 0 0 3px ${colors.accentPrimaryGlow}`,
      },
    },
    memberList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    },
    memberItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      p: 3,
      borderRadius: '12px',
      bg: colors.glassBg,
      border: '1px solid',
      borderColor: colors.glassBorder,
      transition: 'all 0.2s ease',
      _hover: {
        bg: colors.glassBgHover,
      },
    },
    memberText: {
      color: colors.textPrimary,
      fontSize: 'sm',
      fontWeight: '500',
    },
    removeButton: {
      size: 'sm',
      color: '#ef4444',
      bg: 'transparent',
      borderRadius: '10px',
      _hover: {
        bg: 'rgba(239, 68, 68, 0.1)',
      },
    },
    button: {
      color: colors.textPrimary,
      bg: colors.glassBg,
      border: '1px solid',
      borderColor: colors.glassBorder,
      borderRadius: '12px',
      _hover: {
        bg: colors.glassBgHover,
        borderColor: colors.accentPrimary,
      },
    },
    clipboardButton: {
      color: colors.textSecondary,
      bg: 'transparent',
      borderRadius: '10px',
      _hover: {
        bg: colors.glassBgHover,
        color: colors.accentPrimary,
      },
      size: 'sm',
    },
  },

  toolCallIndicator: {
    container: {
      pl: '44px',
      my: '2',
      gap: 3,
      width: '100%',
      minHeight: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bg: `linear-gradient(90deg, ${colors.accentSecondary}10 0%, transparent 100%)`,
      borderRadius: '10px',
      py: 2,
    },
    icon: {
      color: colors.accentSecondary,
      boxSize: '14px',
    },
    text: {
      fontSize: 'xs',
      color: colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: "'JetBrains Mono', monospace",
    },
    spinner: {
      size: 'xs',
      color: colors.accentSecondary,
      ml: 0,
    },
    completedIcon: {
      color: '#22c55e',
      boxSize: '14px',
      ml: 0,
    },
    errorIcon: {
      color: '#ef4444',
      boxSize: '14px',
      ml: 0,
    },
  },
};

export const chatPanelStyles = css`
  .cs-message-list {
    background: ${colors.bgPrimary} !important;
    padding: 16px;
    border-radius: 16px;
  }
  
  .cs-message {
    margin: 14px 0;
  }

  .cs-message__content {
    background: ${colors.glassBg} !important;
    border: 1px solid ${colors.glassBorder} !important;
    border-radius: 14px !important;
    padding: 12px 16px !important;
    color: ${colors.textPrimary} !important;
    font-size: 0.9rem !important;
    line-height: 1.55 !important;
    margin-top: 4px !important;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }

  .cs-message__content:hover {
    background: ${colors.glassBgHover} !important;
    border-color: ${colors.glassBorderHover} !important;
  }

  .cs-message__text {
    padding: 8px 0 !important;
  }

  .cs-message--outgoing .cs-message__content {
    background: linear-gradient(135deg, ${colors.accentPrimary}15 0%, ${colors.accentSecondary}10 100%) !important;
    border-color: ${colors.accentPrimary}40 !important;
  }

  .cs-chat-container {
    background: transparent !important;
    border: 1px solid ${colors.glassBorder};
    border-radius: 16px;
    padding: 8px;
  }

  .cs-main-container {
    border: none !important;
    background: transparent !important;
    width: 100% !important;
    margin-left: 0 !important;
  }

  .cs-message__sender {
    position: absolute !important;
    top: 0 !important;
    left: 36px !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
    color: ${colors.textSecondary} !important;
    letter-spacing: 0.3px;
  }

  .cs-message__content-wrapper {
    max-width: 85%;
    margin: 0 8px;
  }

  .cs-avatar {
    background: linear-gradient(135deg, ${colors.accentPrimary} 0%, ${colors.accentSecondary} 100%) !important;
    color: white !important;
    width: 32px !important;
    height: 32px !important;
    font-size: 13px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 12px ${colors.accentPrimaryGlow};
  }

  .cs-message--outgoing .cs-avatar {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .cs-message__header {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  /* Inner thoughts styling */
  .inner-thought-message .cs-message__content {
    background: linear-gradient(135deg, ${colors.accentSecondary}12 0%, ${colors.accentPrimary}08 100%) !important;
    border-left: 3px solid ${colors.accentSecondary} !important;
    font-style: italic;
  }
`;
