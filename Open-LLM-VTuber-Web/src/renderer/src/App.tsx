/* eslint-disable no-shadow */
// import { StrictMode } from 'react';
import { Box, Flex, ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/sidebar/sidebar";
import Footer from "./components/footer/footer";
import { AiStateProvider } from "./context/ai-state-context";
import { Live2DConfigProvider } from "./context/live2d-config-context";
import { SubtitleProvider } from "./context/subtitle-context";
import { BgUrlProvider } from "./context/bgurl-context";
import { layoutStyles } from "./layout";
import WebSocketHandler from "./services/websocket-handler";
import { CameraProvider } from "./context/camera-context";
import { ChatHistoryProvider } from "./context/chat-history-context";
import { CharacterConfigProvider } from "./context/character-config-context";
import { Toaster } from "./components/ui/toaster";
import { VADProvider } from "./context/vad-context";
import { Live2D } from "./components/canvas/live2d";
import TitleBar from "./components/electron/title-bar";
import { InputSubtitle } from "./components/electron/input-subtitle";
import { ProactiveSpeakProvider } from "./context/proactive-speak-context";
import { ScreenCaptureProvider } from "./context/screen-capture-context";
import { GroupProvider } from "./context/group-context";
import { BrowserProvider } from "./context/browser-context";
import { SetupProvider, useSetup } from "./context/setup-context";
import { ComputerUseProvider } from "./context/computer-use-context";
import OnboardingScreen from "./components/onboarding/onboarding-screen";
import BackendLoadingScreen from "./components/loading/backend-loading-screen";
import { useBackendStatus } from "./hooks/use-backend-status";
// eslint-disable-next-line import/no-extraneous-dependencies, import/newline-after-import
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import Background from "./components/canvas/background";
import WebSocketStatus from "./components/canvas/ws-status";
import Subtitle from "./components/canvas/subtitle";
import { ModeProvider, useMode } from "./context/mode-context";

// Premium color palette
const premiumColors = {
  bgDeep: '#0a0a0f',
  bgPrimary: '#12121a',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accentPrimary: '#8b5cf6',
  accentSecondary: '#06b6d4',
};

function AppContent(): JSX.Element {
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(false);
  const { mode } = useMode();
  const isElectron = window.api !== undefined;
  const live2dContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

    
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.documentElement.style.position = 'fixed';
  document.body.style.position = 'fixed';
  document.documentElement.style.width = '100%';
  document.body.style.width = '100%';

  // Premium styling for Live2D container base
  const live2dBaseStyle = {
    position: "absolute" as const,
    overflow: "hidden",
    transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    pointerEvents: "auto" as const,
  };

  // Window mode with responsive sidebar
  const getResponsiveLive2DWindowStyle = (sidebarVisible: boolean) => ({
    ...live2dBaseStyle,
    top: isElectron ? "30px" : "0px",
    height: `calc(100% - ${isElectron ? "30px" : "0px"})`,
    zIndex: 5,
    left: {
      base: "0px",
      md: sidebarVisible ? "380px" : "24px",
    },
    width: {
      base: "100%",
      md: `calc(100% - ${sidebarVisible ? "380px" : "24px"})`,
    },
  });

  // Pet mode - full screen transparent
  const live2dPetStyle = {
    ...live2dBaseStyle,
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 15,
    // Transparent background for realistic feel
    background: "transparent",
  };

  return (
    <>
      {/* Premium ambient orbs for visual effect */}
      {mode === "window" && (
        <>
          <Box
            position="fixed"
            top="-150px"
            right="-150px"
            width="500px"
            height="500px"
            borderRadius="50%"
            background={premiumColors.accentPrimary}
            filter="blur(120px)"
            opacity={0.08}
            pointerEvents="none"
            zIndex={0}
          />
          <Box
            position="fixed"
            bottom="-100px"
            left="-100px"
            width="400px"
            height="400px"
            borderRadius="50%"
            background={premiumColors.accentSecondary}
            filter="blur(100px)"
            opacity={0.06}
            pointerEvents="none"
            zIndex={0}
          />
        </>
      )}

      {/* Live2D Avatar Container */}
      <Box
        ref={live2dContainerRef}
        {...(mode === "window"
          ? getResponsiveLive2DWindowStyle(showSidebar)
          : live2dPetStyle)}
      >
        <Live2D />
      </Box>

      {/* Window Mode UI */}
      {mode === "window" && (
        <>
          {isElectron && <TitleBar />}
          <Flex {...layoutStyles.appContainer}>
            {/* Sidebar */}
            <Box
              {...layoutStyles.sidebar}
              {...(!showSidebar && { width: "24px" })}
            >
              <Sidebar
                isCollapsed={!showSidebar}
                onToggle={() => setShowSidebar(!showSidebar)}
              />
            </Box>
            
            {/* Main Content Area */}
            <Box {...layoutStyles.mainContent}>
              {/* Transparent/Minimal Background for Avatar */}
              <Background />
              
              {/* WebSocket Status - Premium styled */}
              <Box 
                position="absolute" 
                top="20px" 
                left="20px" 
                zIndex={10}
              >
                <WebSocketStatus />
              </Box>
              
              {/* Subtitle Display - Premium glass panel */}
              <Box
                position="absolute"
                bottom={isFooterCollapsed ? "45px" : "130px"}
                left="50%"
                transform="translateX(-50%)"
                zIndex={10}
                width="auto"
                maxW="70%"
                transition="all 0.35s ease"
              >
                <Subtitle />
              </Box>
              
              {/* Footer - Premium styled */}
              <Box
                {...layoutStyles.footer}
                zIndex={10}
                {...(isFooterCollapsed && layoutStyles.collapsedFooter)}
              >
                <Footer
                  isCollapsed={isFooterCollapsed}
                  onToggle={() => setIsFooterCollapsed(!isFooterCollapsed)}
                />
              </Box>
            </Box>
          </Flex>
        </>
      )}

      {/* Pet Mode UI */}
      {mode === "pet" && <InputSubtitle />}
    </>
  );
}

function App(): JSX.Element {
  return (
    <ChakraProvider value={defaultSystem}>
      <SetupProvider>
        <ModeProvider>
          <AppWithSetupGate />
        </ModeProvider>
      </SetupProvider>
    </ChakraProvider>
  );
}

function AppWithSetupGate(): JSX.Element {
  const { isSetupComplete, isCheckingSetup } = useSetup();
  const { status, downloadProgress, isReady } = useBackendStatus();
  const isElectron = window.api !== undefined;
  
  // In Electron, show loading screen while backend is starting
  // Skip loading screen for web mode (backend managed externally)
  if (isElectron && !isReady) {
    return (
      <BackendLoadingScreen 
        status={status === 'downloading' ? 'downloading' : 'starting'}
        downloadProgress={downloadProgress}
      />
    );
  }
  
  // Show loading while checking if setup is complete
  if (isCheckingSetup) {
    return (
      <BackendLoadingScreen 
        status="starting"
        downloadProgress={0}
      />
    );
  }
  
  // Show onboarding if setup is not complete (API key not configured)
  if (!isSetupComplete) {
    return <OnboardingScreen />;
  }
  
  return <AppWithGlobalStyles />;
}

function AppWithGlobalStyles(): JSX.Element {
  return (
    <>
      <CameraProvider>
        <ScreenCaptureProvider>
          <CharacterConfigProvider>
            <ChatHistoryProvider>
              <AiStateProvider>
                <ProactiveSpeakProvider>
                  <Live2DConfigProvider>
                    <SubtitleProvider>
                      <VADProvider>
                        <BgUrlProvider>
                          <GroupProvider>
                            <BrowserProvider>
                              <ComputerUseProvider>
                                <WebSocketHandler>
                                  <Toaster />
                                  <AppContent />
                                </WebSocketHandler>
                              </ComputerUseProvider>
                            </BrowserProvider>
                          </GroupProvider>
                        </BgUrlProvider>
                      </VADProvider>
                    </SubtitleProvider>
                  </Live2DConfigProvider>
                </ProactiveSpeakProvider>
              </AiStateProvider>
            </ChatHistoryProvider>
          </CharacterConfigProvider>
        </ScreenCaptureProvider>
      </CameraProvider>
    </>
  );
}

export default App;
