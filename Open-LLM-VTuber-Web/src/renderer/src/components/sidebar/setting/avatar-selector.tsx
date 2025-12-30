import { Box, Text, Flex, Grid, Image } from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUser, FiCheck } from 'react-icons/fi';
import { useConfig } from '@/context/character-config-context';
import { useSwitchCharacter } from '@/hooks/utils/use-switch-character';

// Premium colors
const colors = {
  bgPrimary: '#12121a',
  bgSecondary: '#1a1a25',
  glassBg: 'rgba(255, 255, 255, 0.03)',
  glassBgHover: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassBorderHover: 'rgba(255, 255, 255, 0.15)',
  accentPrimary: '#8b5cf6',
  accentSecondary: '#06b6d4',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  success: '#22c55e',
};

// Avatar data with metadata
const avatars = [
  {
    id: 'avatar_luna.yaml',
    name: 'Luna',
    model: 'natori',
    description: 'Professional AI with natural expressions',
    style: 'Professional',
    color: '#8b5cf6',
  },
  {
    id: 'avatar_haru.yaml',
    name: 'Haru',
    model: 'haru',
    description: 'Expressive character with rich animations',
    style: 'Energetic',
    color: '#ec4899',
  },
  {
    id: 'avatar_mao.yaml',
    name: 'Mao',
    model: 'mao_official',
    description: 'Cute witch with magical expressions',
    style: 'Playful',
    color: '#f59e0b',
  },
  {
    id: 'avatar_hiyori.yaml',
    name: 'Hiyori',
    model: 'hiyori',
    description: 'Professional office woman',
    style: 'Business',
    color: '#06b6d4',
  },
  {
    id: 'avatar_shizuku.yaml',
    name: 'Shizuku',
    model: 'shizuku',
    description: 'Classic elegant character',
    style: 'Elegant',
    color: '#10b981',
  },
  {
    id: 'avatar_mao_pro.yaml',
    name: 'Mao Pro',
    model: 'mao_pro',
    description: 'Premium casual witch',
    style: 'Casual',
    color: '#f97316',
  },
];

interface AvatarCardProps {
  avatar: typeof avatars[0];
  isSelected: boolean;
  onSelect: () => void;
}

function AvatarCard({ avatar, isSelected, onSelect }: AvatarCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Box
      position="relative"
      borderRadius="xl"
      overflow="hidden"
      cursor="pointer"
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transition="all 0.3s ease"
      transform={isHovered ? 'translateY(-4px)' : 'translateY(0)'}
      bg={isSelected ? `linear-gradient(135deg, ${avatar.color}15 0%, ${avatar.color}08 100%)` : colors.glassBg}
      border="2px solid"
      borderColor={isSelected ? avatar.color : (isHovered ? colors.glassBorderHover : colors.glassBorder)}
      boxShadow={isSelected 
        ? `0 8px 32px ${avatar.color}30, inset 0 0 0 1px ${avatar.color}40`
        : (isHovered ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)')
      }
      _hover={{
        bg: isSelected ? undefined : colors.glassBgHover,
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <Box
          position="absolute"
          top={2}
          right={2}
          zIndex={2}
          w="24px"
          h="24px"
          borderRadius="full"
          bg={avatar.color}
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxShadow={`0 2px 8px ${avatar.color}60`}
        >
          <FiCheck size={14} color="white" />
        </Box>
      )}

      {/* Avatar Preview Area */}
      <Box
        h="100px"
        bg={`linear-gradient(135deg, ${avatar.color}10 0%, transparent 50%)`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
      >
        <Box
          w="60px"
          h="60px"
          borderRadius="full"
          bg={`linear-gradient(135deg, ${avatar.color}30 0%, ${avatar.color}10 100%)`}
          border="2px solid"
          borderColor={`${avatar.color}40`}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="2xl" fontWeight="bold" color={avatar.color}>
            {avatar.name.charAt(0)}
          </Text>
        </Box>
        
        {/* Style badge */}
        <Box
          position="absolute"
          bottom={2}
          left={2}
          px={2}
          py={0.5}
          borderRadius="full"
          bg={`${avatar.color}20`}
          border="1px solid"
          borderColor={`${avatar.color}40`}
        >
          <Text fontSize="9px" fontWeight="600" color={avatar.color} textTransform="uppercase" letterSpacing="0.05em">
            {avatar.style}
          </Text>
        </Box>
      </Box>

      {/* Info */}
      <Box p={3}>
        <Text 
          fontSize="sm" 
          fontWeight="600" 
          color={colors.textPrimary}
          mb={1}
        >
          {avatar.name}
        </Text>
        <Text 
          fontSize="xs" 
          color={colors.textSecondary}
          lineHeight="1.4"
          noOfLines={2}
        >
          {avatar.description}
        </Text>
      </Box>
    </Box>
  );
}

function AvatarSelector() {
  const { t } = useTranslation();
  const { confName, configFiles } = useConfig();
  const { switchCharacter } = useSwitchCharacter();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Find current avatar based on confName
  useEffect(() => {
    const current = avatars.find(a => a.name === confName);
    if (current) {
      setSelectedAvatar(current.id);
    }
  }, [confName]);

  const handleSelectAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    switchCharacter(avatarId);
  };

  return (
    <Box>
      {/* Header */}
      <Flex alignItems="center" gap={2} mb={4}>
        <Box
          p={2}
          borderRadius="lg"
          bg="linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)"
        >
          <FiUser size={18} color={colors.accentPrimary} />
        </Box>
        <Box>
          <Text fontSize="md" fontWeight="600" color={colors.textPrimary}>
            Choose Avatar
          </Text>
          <Text fontSize="xs" color={colors.textSecondary}>
            Select your AI companion's appearance
          </Text>
        </Box>
      </Flex>

      {/* Avatar Grid */}
      <Grid
        templateColumns="repeat(2, 1fr)"
        gap={3}
      >
        {avatars.map((avatar) => (
          <AvatarCard
            key={avatar.id}
            avatar={avatar}
            isSelected={selectedAvatar === avatar.id}
            onSelect={() => handleSelectAvatar(avatar.id)}
          />
        ))}
      </Grid>

      {/* Current Selection Info */}
      {selectedAvatar && (
        <Box
          mt={4}
          p={3}
          borderRadius="lg"
          bg={colors.glassBg}
          border="1px solid"
          borderColor={colors.glassBorder}
        >
          <Flex alignItems="center" gap={2}>
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={colors.success}
              boxShadow={`0 0 8px ${colors.success}`}
            />
            <Text fontSize="xs" color={colors.textSecondary}>
              Active: <Text as="span" color={colors.textPrimary} fontWeight="500">
                {avatars.find(a => a.id === selectedAvatar)?.name}
              </Text>
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

export default AvatarSelector;


