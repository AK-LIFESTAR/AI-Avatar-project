/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react-hooks/rules-of-hooks */
import { Stack, Box, Text } from '@chakra-ui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { settingStyles } from './setting-styles';
import { useLive2dSettings } from '@/hooks/sidebar/setting/use-live2d-settings';
import { SwitchField } from './common';
import AvatarSelector from './avatar-selector';

// Premium colors
const colors = {
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
};

interface live2DProps {
  onSave?: (callback: () => void) => () => void
  onCancel?: (callback: () => void) => () => void
}

function live2D({ onSave, onCancel }: live2DProps): JSX.Element {
  const { t } = useTranslation();
  const {
    modelInfo,
    handleInputChange,
    handleSave,
    handleCancel,
  } = useLive2dSettings();

  useEffect(() => {
    if (!onSave || !onCancel) return;

    const cleanupSave = onSave(handleSave);
    const cleanupCancel = onCancel(handleCancel);

    return (): void => {
      cleanupSave?.();
      cleanupCancel?.();
    };
  }, [onSave, onCancel]);

  return (
    <Stack {...settingStyles.common.container} gap={6}>
      {/* Avatar Selection Section */}
      <AvatarSelector />

      {/* Divider */}
      <Box 
        h="1px" 
        bg="linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" 
      />

      {/* Display Settings */}
      <Box>
        <Text 
          fontSize="sm" 
          fontWeight="600" 
          color="rgba(255, 255, 255, 0.9)"
          mb={3}
        >
          Display Settings
        </Text>
        
        <Stack gap={3}>
          <Box
            p={3}
            borderRadius="lg"
            bg={colors.glassBg}
            border="1px solid"
            borderColor={colors.glassBorder}
          >
      <SwitchField
        label={t('settings.live2d.pointerInteractive')}
        checked={modelInfo.pointerInteractive ?? false}
        onChange={(checked) => handleInputChange('pointerInteractive', checked)}
      />
            <Text fontSize="xs" color={colors.textSecondary} mt={1}>
              Enable mouse interaction with avatar
            </Text>
          </Box>

          <Box
            p={3}
            borderRadius="lg"
            bg={colors.glassBg}
            border="1px solid"
            borderColor={colors.glassBorder}
          >
      <SwitchField
        label={t('settings.live2d.scrollToResize')}
        checked={modelInfo.scrollToResize ?? true}
        onChange={(checked) => handleInputChange('scrollToResize', checked)}
      />
            <Text fontSize="xs" color={colors.textSecondary} mt={1}>
              Scroll to resize the avatar
            </Text>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}

export default live2D;
