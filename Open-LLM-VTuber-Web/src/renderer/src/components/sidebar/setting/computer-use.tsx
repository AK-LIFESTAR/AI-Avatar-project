import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Input,
  NativeSelect,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { LuTriangleAlert, LuMonitor, LuShield, LuTimer, LuZap } from 'react-icons/lu';
import { settingStyles } from './setting-styles';
import { Field } from '@/components/ui/field';

interface ComputerUseSettingsProps {
  onSave: (handler: () => void) => () => void;
  onCancel: (handler: () => void) => () => void;
}

interface ComputerUseConfig {
  enabled: boolean;
  vision_llm_provider: string;
  max_actions_per_session: number;
  action_rate_limit: number;
  screenshot_scale: number;
  kill_switch_corner: string;
  require_confirmation: boolean;
  session_timeout: number;
  log_screenshots: boolean;
  dry_run: boolean;
}

const defaultConfig: ComputerUseConfig = {
  enabled: false,
  vision_llm_provider: 'openai_llm',
  max_actions_per_session: 50,
  action_rate_limit: 5,
  screenshot_scale: 0.5,
  kill_switch_corner: 'top_left',
  require_confirmation: false,
  session_timeout: 300,
  log_screenshots: false,
  dry_run: false,
};

const colors = {
  bgCard: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  accentPurple: '#8b5cf6',
  accentOrange: '#f59e0b',
  accentRed: '#ef4444',
};

function ComputerUseSettings({ onSave, onCancel }: ComputerUseSettingsProps): JSX.Element {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ComputerUseConfig>(defaultConfig);
  const [originalConfig, setOriginalConfig] = useState<ComputerUseConfig>(defaultConfig);

  // Load config from backend
  useEffect(() => {
    // In a real implementation, this would fetch from the backend
    // For now, we use default values
    setConfig(defaultConfig);
    setOriginalConfig(defaultConfig);
  }, []);

  const handleSave = useCallback(() => {
    // Send config to backend via WebSocket or API
    console.log('Saving computer use config:', config);
    // TODO: Implement actual save logic
  }, [config]);

  const handleCancel = useCallback(() => {
    setConfig(originalConfig);
  }, [originalConfig]);

  useEffect(() => {
    const unsubSave = onSave(handleSave);
    const unsubCancel = onCancel(handleCancel);
    return () => {
      unsubSave();
      unsubCancel();
    };
  }, [onSave, onCancel, handleSave, handleCancel]);

  const updateConfig = (key: keyof ComputerUseConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <VStack gap={4} align="stretch" {...settingStyles.general.container}>
      {/* Warning Banner */}
      <Box
        p={4}
        borderRadius="lg"
        background={`${colors.accentRed}15`}
        border={`1px solid ${colors.accentRed}40`}
      >
        <HStack gap={3} align="start">
          <Box mt={0.5}>
            <LuTriangleAlert size={20} color={colors.accentRed} />
          </Box>
          <VStack align="start" gap={1}>
            <Text fontWeight="600" color={colors.accentRed}>
              {t('settings.computerUse.warning', 'Security Warning')}
            </Text>
            <Text fontSize="sm" color={colors.textSecondary}>
              {t('settings.computerUse.warningText', 
                'This feature allows AI to control your mouse and keyboard. Only enable if you trust the AI model and understand the risks.')}
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Enable Switch */}
      <Box
        p={4}
        borderRadius="lg"
        background={colors.bgCard}
        border={`1px solid ${colors.border}`}
      >
        <HStack justify="space-between">
          <VStack align="start" gap={1}>
            <HStack gap={2}>
              <LuMonitor size={18} color={colors.accentPurple} />
              <Text fontWeight="600" color={colors.textPrimary}>
                {t('settings.computerUse.enable', 'Enable Computer Use')}
              </Text>
            </HStack>
            <Text fontSize="sm" color={colors.textMuted}>
              {t('settings.computerUse.enableDesc', 'Allow AI to control your computer')}
            </Text>
          </VStack>
          <Switch.Root
            checked={config.enabled}
            onCheckedChange={(e) => updateConfig('enabled', e.checked)}
            colorPalette="purple"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </HStack>
      </Box>

      {/* LLM Provider */}
      <Field label={t('settings.computerUse.llmProvider', 'Vision LLM Provider')}>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={config.vision_llm_provider}
            onChange={(e) => updateConfig('vision_llm_provider', e.target.value)}
          >
            <option value="openai_llm">OpenAI (GPT-4o)</option>
            <option value="claude_llm">Claude (Vision)</option>
            <option value="gemini_llm">Gemini (Vision)</option>
            <option value="ollama_llm">Ollama (Local Vision Model)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Text fontSize="xs" color={colors.textMuted} mt={1}>
          {t('settings.computerUse.llmProviderDesc', 'Must be a vision-capable model')}
        </Text>
      </Field>

      {/* Safety Settings */}
      <Box
        p={4}
        borderRadius="lg"
        background={colors.bgCard}
        border={`1px solid ${colors.border}`}
      >
        <HStack gap={2} mb={4}>
          <LuShield size={18} color={colors.accentOrange} />
          <Text fontWeight="600" color={colors.textPrimary}>
            {t('settings.computerUse.safety', 'Safety Settings')}
          </Text>
        </HStack>

        <VStack gap={4} align="stretch">
          {/* Kill Switch Corner */}
          <Field label={t('settings.computerUse.killSwitch', 'Kill Switch Corner')}>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={config.kill_switch_corner}
                onChange={(e) => updateConfig('kill_switch_corner', e.target.value)}
              >
                <option value="top_left">Top Left</option>
                <option value="top_right">Top Right</option>
                <option value="bottom_left">Bottom Left</option>
                <option value="bottom_right">Bottom Right</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Text fontSize="xs" color={colors.textMuted} mt={1}>
              {t('settings.computerUse.killSwitchDesc', 'Move mouse to this corner to stop all actions')}
            </Text>
          </Field>

          {/* Max Actions */}
          <Field label={t('settings.computerUse.maxActions', 'Max Actions Per Session')}>
            <Input
              type="number"
              value={config.max_actions_per_session}
              onChange={(e) => updateConfig('max_actions_per_session', parseInt(e.target.value) || 50)}
              min={1}
              max={500}
            />
          </Field>

          {/* Rate Limit */}
          <Field label={t('settings.computerUse.rateLimit', 'Actions Per Second')}>
            <Input
              type="number"
              value={config.action_rate_limit}
              onChange={(e) => updateConfig('action_rate_limit', parseFloat(e.target.value) || 5)}
              min={0.1}
              max={20}
              step={0.1}
            />
          </Field>

          {/* Session Timeout */}
          <Field label={t('settings.computerUse.timeout', 'Session Timeout (seconds)')}>
            <Input
              type="number"
              value={config.session_timeout}
              onChange={(e) => updateConfig('session_timeout', parseInt(e.target.value) || 300)}
              min={30}
              max={3600}
            />
          </Field>

          {/* Require Confirmation */}
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color={colors.textPrimary}>
                {t('settings.computerUse.requireConfirm', 'Require Confirmation')}
              </Text>
              <Text fontSize="xs" color={colors.textMuted}>
                {t('settings.computerUse.requireConfirmDesc', 'Ask before each action')}
              </Text>
            </VStack>
            <Switch.Root
              checked={config.require_confirmation}
              onCheckedChange={(e) => updateConfig('require_confirmation', e.checked)}
              colorPalette="orange"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>
        </VStack>
      </Box>

      {/* Performance Settings */}
      <Box
        p={4}
        borderRadius="lg"
        background={colors.bgCard}
        border={`1px solid ${colors.border}`}
      >
        <HStack gap={2} mb={4}>
          <LuZap size={18} color={colors.accentPurple} />
          <Text fontWeight="600" color={colors.textPrimary}>
            {t('settings.computerUse.performance', 'Performance')}
          </Text>
        </HStack>

        <VStack gap={4} align="stretch">
          {/* Screenshot Scale */}
          <Field label={t('settings.computerUse.screenshotScale', 'Screenshot Scale')}>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={config.screenshot_scale.toString()}
                onChange={(e) => updateConfig('screenshot_scale', parseFloat(e.target.value))}
              >
                <option value="0.25">25% (Fastest)</option>
                <option value="0.5">50% (Balanced)</option>
                <option value="0.75">75% (Better Quality)</option>
                <option value="1">100% (Best Quality)</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field>

          {/* Log Screenshots */}
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color={colors.textPrimary}>
                {t('settings.computerUse.logScreenshots', 'Log Screenshots')}
              </Text>
              <Text fontSize="xs" color={colors.textMuted}>
                {t('settings.computerUse.logScreenshotsDesc', 'Save screenshots for review (uses disk space)')}
              </Text>
            </VStack>
            <Switch.Root
              checked={config.log_screenshots}
              onCheckedChange={(e) => updateConfig('log_screenshots', e.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>

          {/* Dry Run */}
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="sm" color={colors.textPrimary}>
                {t('settings.computerUse.dryRun', 'Dry Run Mode')}
              </Text>
              <Text fontSize="xs" color={colors.textMuted}>
                {t('settings.computerUse.dryRunDesc', 'Log actions without executing (for testing)')}
              </Text>
            </VStack>
            <Switch.Root
              checked={config.dry_run}
              onCheckedChange={(e) => updateConfig('dry_run', e.checked)}
              colorPalette="cyan"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
}

export default ComputerUseSettings;

