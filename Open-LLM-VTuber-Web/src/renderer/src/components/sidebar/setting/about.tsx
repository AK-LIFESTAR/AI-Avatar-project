import { 
  Box, 
  Stack, 
  Text, 
  Heading, 
  HStack,
  Icon,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { FaGithub, FaBook } from 'react-icons/fa';
import { settingStyles } from './setting-styles';
import { Button } from '@/components/ui/button';

function About(): JSX.Element {
  const { t } = useTranslation();
  
  const openExternalLink = (url: string) => {
    // Handle external link opening via electron
    window.open(url, '_blank');
  };
  
  const appVersion = '1.2.1';

  return (
    <Stack {...settingStyles.common.container} gap={3}>
      {/* Premium Header */}
      <Box 
        textAlign="center" 
        py={4} 
        px={4} 
        borderRadius="16px"
        bg="linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)"
        border="1px solid"
        borderColor="rgba(139, 92, 246, 0.2)"
        mb={2}
      >
        <Box
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          width="50px"
          height="50px"
          borderRadius="12px"
          bg="linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)"
          mb={3}
        >
          <Text fontSize="xl" fontWeight="bold" color="white">A</Text>
        </Box>
        <Heading 
          size="lg" 
          mb={1}
          bgGradient="linear(to-r, #8b5cf6, #06b6d4)"
          bgClip="text"
        >
          Project A Prototype
        </Heading>
        <Text fontSize="sm" color="whiteAlpha.700">
          {t("settings.about.title")}
        </Text>
      </Box>

      <Box>
        <Text fontWeight="bold" mb={0} color="whiteAlpha.600" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
          {t("settings.about.version")}
        </Text>
        <Text fontSize="lg" fontWeight="600">{appVersion}</Text>
      </Box>
      
      <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={3} mt={1} />
      
      <Box mt={1}>
        <Text fontWeight="bold" mb={2} color="whiteAlpha.600" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
          {t("settings.about.projectLinks")}
        </Text>
        <HStack mt={1} gap={2}>
          <Button
            size="sm"
            onClick={() =>
              openExternalLink(
                "https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web"
              )
            }
          >
            <Icon as={FaGithub} mr={2} /> {t("settings.about.github")}
          </Button>
          <Button
            size="sm"
            onClick={() => openExternalLink("https://docs.llmvtuber.com")}
          >
            <Icon as={FaBook} mr={2} /> {t("settings.about.documentation")}
          </Button>
        </HStack>
      </Box>
      
      <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={3} mt={1} />
      
      <Box mt={1}>
        <Button 
          size="xs" 
          variant="ghost"
          color="whiteAlpha.700"
          onClick={() => openExternalLink("https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/main/LICENSE")}
        >
          {t("settings.about.viewLicense")}
        </Button>
      </Box>
      
      <Box mt={2} textAlign="center">
        <Text fontSize="xs" color="whiteAlpha.400">
          © {new Date().getFullYear()} Project A Prototype
        </Text>
      </Box>
    </Stack>
  );
}

export default About;
