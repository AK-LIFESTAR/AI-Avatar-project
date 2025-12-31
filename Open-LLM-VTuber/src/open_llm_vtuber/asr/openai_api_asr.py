import io
import wave
import numpy as np
from loguru import logger
from openai import OpenAI
from .asr_interface import ASRInterface


class VoiceRecognition(ASRInterface):
    """OpenAI Whisper API for fast cloud-based speech recognition."""

    def __init__(
        self, api_key: str, model: str = "whisper-1", lang: str = "en"
    ) -> None:
        """Initialize OpenAI Whisper ASR.

        Args:
            api_key: OpenAI API key.
            model: Model name (default: whisper-1).
            lang: Language code (default: en).
        """
        logger.info("Initializing OpenAI Whisper API ASR...")
        self.client = OpenAI(api_key=api_key)
        self.lang = lang
        self.model = model

    def transcribe_np(self, audio: np.ndarray) -> str:
        """Transcribe speech audio in numpy array format and return the transcription.

        Args:
            audio: The numpy array of the audio data to transcribe.

        Returns:
            The transcribed text.
        """
        logger.info("Transcribing audio (OpenAI Whisper API)...")

        # Make sure the audio is in the range [-1, 1]
        audio = np.clip(audio, -1, 1)
        # Convert the audio to 16-bit PCM
        audio_integer = (audio * 32767).astype(np.int16)

        # OpenAI API requires a file-like object
        audio_buffer = io.BytesIO()

        with wave.open(audio_buffer, "wb") as wf:
            wf.setnchannels(self.NUM_CHANNELS)
            wf.setsampwidth(self.SAMPLE_WIDTH)
            wf.setframerate(self.SAMPLE_RATE)
            wf.writeframes(audio_integer.tobytes())

        audio_buffer.seek(0)

        # Transcribe using OpenAI Whisper API
        transcription = self.client.audio.transcriptions.create(
            file=("audio.wav", audio_buffer.read()),
            model=self.model,
            response_format="text",
            language=self.lang if self.lang else None,
        )

        return transcription





