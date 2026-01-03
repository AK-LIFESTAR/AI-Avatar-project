/* eslint-disable */
import { Tabs } from '@chakra-ui/react'
import { FiCamera, FiMonitor, FiGlobe } from 'react-icons/fi'
import { LuMousePointer2 } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { sidebarStyles } from './sidebar-styles'
import CameraPanel from './camera-panel'
import ScreenPanel from './screen-panel'
import BrowserPanel from './browser-panel'
import ComputerUsePanel from './computer-use-panel'

function BottomTab(): JSX.Element {
  const { t } = useTranslation();
  
  return (
    <Tabs.Root 
      defaultValue="camera" 
      variant="plain"
      {...sidebarStyles.bottomTab.container}
    >
      <Tabs.List {...sidebarStyles.bottomTab.list}>
        <Tabs.Trigger value="camera" {...sidebarStyles.bottomTab.trigger} title={t('sidebar.camera')}>
          <FiCamera size={14} />
          <span>Cam</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="screen" {...sidebarStyles.bottomTab.trigger} title={t('sidebar.screen')}>
          <FiMonitor size={14} />
          <span>Screen</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="browser" {...sidebarStyles.bottomTab.trigger} title={t('sidebar.browser')}>
          <FiGlobe size={14} />
          <span>Web</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="computer-use" {...sidebarStyles.bottomTab.trigger} title={t('sidebar.computerUse', 'PC Control')}>
          <LuMousePointer2 size={14} />
          <span>PC</span>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="camera">
        <CameraPanel />
      </Tabs.Content>
      
      <Tabs.Content value="screen">
        <ScreenPanel />
      </Tabs.Content>
      
      <Tabs.Content value="browser">
        <BrowserPanel />
      </Tabs.Content>

      <Tabs.Content value="computer-use">
        <ComputerUsePanel />
      </Tabs.Content>
    </Tabs.Root>
  );
}

export default BottomTab
