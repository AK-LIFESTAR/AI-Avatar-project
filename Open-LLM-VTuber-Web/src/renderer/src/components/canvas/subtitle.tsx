import { Box, Text, Flex } from '@chakra-ui/react';
import { memo, useMemo } from 'react';
import { canvasStyles } from './canvas-styles';
import { useSubtitleDisplay } from '@/hooks/canvas/use-subtitle-display';
import { useSubtitle } from '@/context/subtitle-context';

// Parse text to identify inner thoughts (text in parentheses)
const parseSubtitleText = (text: string) => {
  const parts: Array<{ type: 'speech' | 'thought'; content: string }> = [];
  
  // Match text in parentheses as thoughts, everything else as speech
  const regex = /\(([^)]+)\)|([^()]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      // Content inside parentheses - inner thought
      parts.push({ type: 'thought', content: match[1].trim() });
    } else if (match[2] && match[2].trim()) {
      // Content outside parentheses - speech
      parts.push({ type: 'speech', content: match[2].trim() });
    }
  }
  
  return parts;
};

// Inner Thought Component
const InnerThought = memo(({ text }: { text: string }) => (
  <Box {...canvasStyles.innerThought.container}>
    <Flex {...canvasStyles.innerThought.label}>
      <Box
        as="span"
        display="inline-block"
        width="6px"
        height="6px"
        borderRadius="50%"
        bg="#06b6d4"
        boxShadow="0 0 8px rgba(6, 182, 212, 0.6)"
      />
      Inner Thoughts
    </Flex>
    <Text {...canvasStyles.innerThought.text}>
      {text}
    </Text>
  </Box>
));

InnerThought.displayName = 'InnerThought';

// Speech Text Component
const SpeechText = memo(({ text }: { text: string }) => (
  <Text {...canvasStyles.subtitle.text}>
    {text}
  </Text>
));

SpeechText.displayName = 'SpeechText';

// Main Subtitle Component
const Subtitle = memo((): JSX.Element | null => {
  const { subtitleText, isLoaded } = useSubtitleDisplay();
  const { showSubtitle } = useSubtitle();

  // Parse the subtitle text to separate speech from thoughts
  const parsedContent = useMemo(() => {
    if (!subtitleText) return [];
    return parseSubtitleText(subtitleText);
  }, [subtitleText]);

  if (!isLoaded || !subtitleText || !showSubtitle) return null;

  // Check if we have any thoughts
  const hasThoughts = parsedContent.some(p => p.type === 'thought');
  const hasOnlyThoughts = parsedContent.every(p => p.type === 'thought');

  // If only thoughts, show in a different style
  if (hasOnlyThoughts && parsedContent.length > 0) {
    return (
      <Flex direction="column" gap={2} align="center">
        {parsedContent.map((part, index) => (
          <InnerThought key={index} text={part.content} />
        ))}
      </Flex>
    );
  }

  // Mixed or speech only
  return (
    <Flex direction="column" gap={3} align="center">
      {/* Main speech bubble */}
      {parsedContent.filter(p => p.type === 'speech').length > 0 && (
    <Box {...canvasStyles.subtitle.container}>
          {parsedContent
            .filter(p => p.type === 'speech')
            .map((part, index) => (
              <SpeechText key={index} text={part.content} />
            ))}
    </Box>
      )}
      
      {/* Inner thoughts below speech */}
      {hasThoughts && (
        <Flex direction="column" gap={2} align="center">
          {parsedContent
            .filter(p => p.type === 'thought')
            .map((part, index) => (
              <InnerThought key={index} text={part.content} />
            ))}
        </Flex>
      )}
    </Flex>
  );
});

Subtitle.displayName = 'Subtitle';

export default Subtitle;
