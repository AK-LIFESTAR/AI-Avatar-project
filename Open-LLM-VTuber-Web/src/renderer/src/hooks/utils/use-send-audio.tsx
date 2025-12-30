import { useCallback } from "react";
import { useWebSocket } from "@/context/websocket-context";
import { useMediaCapture } from "@/hooks/utils/use-media-capture";

export function useSendAudio() {
  const { sendMessage } = useWebSocket();
  const { captureAllMedia } = useMediaCapture();

  const sendAudioPartition = useCallback(
    async (audio: Float32Array) => {
      const chunkSize = 4096;

      // Capture images as early as possible so vision questions answered via mic
      // don't race with frame capture and accidentally send no images.
      const initialImages = await captureAllMedia();

      // Send the audio data in chunks
      for (let index = 0; index < audio.length; index += chunkSize) {
        const endIndex = Math.min(index + chunkSize, audio.length);
        const chunk = audio.slice(index, endIndex);
        sendMessage({
          type: "mic-audio-data",
          audio: Array.from(chunk),
        });
      }

      // Send end signal after all chunks
      // If early capture failed (e.g. stream not ready yet), try once more at end.
      const images = initialImages?.length ? initialImages : await captureAllMedia();
      sendMessage({ type: "mic-audio-end", images });
    },
    [sendMessage, captureAllMedia],
  );

  return {
    sendAudioPartition,
  };
}
