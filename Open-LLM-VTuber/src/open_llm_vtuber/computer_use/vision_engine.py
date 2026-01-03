"""VisionEngine for screen capture and LLM communication.

This module provides the VisionEngine class that captures screenshots
using MSS and communicates with vision-capable LLMs for UI analysis.
"""

import base64
import io
from typing import Any
from loguru import logger

from .types import ScreenCapture

# Lazy imports for optional dependencies
_mss = None
_PIL_Image = None


def _get_mss():
    """Lazily import mss for screen capture."""
    global _mss
    if _mss is None:
        try:
            import mss

            _mss = mss
        except ImportError:
            raise ImportError(
                "MSS is required for screen capture. Install with: uv add mss"
            )
    return _mss


def _get_pil():
    """Lazily import PIL for image processing."""
    global _PIL_Image
    if _PIL_Image is None:
        try:
            from PIL import Image

            _PIL_Image = Image
        except ImportError:
            raise ImportError(
                "Pillow is required for image processing. Install with: uv add pillow"
            )
    return _PIL_Image


class VisionEngine:
    """Captures screen and communicates with vision LLMs.

    This class handles high-speed screen capture using MSS and prepares
    images for vision-capable LLMs like GPT-4o or Llama-4-Vision.

    Attributes:
        scale_factor: Factor to scale screenshots (0.0-1.0).
        target_width: Target width for scaled images.
        target_height: Target height for scaled images.
        jpeg_quality: JPEG compression quality (1-100).
    """

    def __init__(
        self,
        scale_factor: float = 0.5,
        target_width: int | None = 1280,
        target_height: int | None = 720,
        jpeg_quality: int = 85,
    ):
        """Initialize the VisionEngine.

        Args:
            scale_factor: Scale factor for screenshots (0.1-1.0).
            target_width: Target width in pixels (None to use scale_factor).
            target_height: Target height in pixels (None to use scale_factor).
            jpeg_quality: JPEG compression quality (1-100).
        """
        self.scale_factor = max(0.1, min(1.0, scale_factor))
        self.target_width = target_width
        self.target_height = target_height
        self.jpeg_quality = max(1, min(100, jpeg_quality))

        # Initialize MSS
        self._sct = None
        self._monitors: list[dict[str, int]] = []

        logger.info(
            f"VisionEngine initialized (scale={self.scale_factor}, "
            f"target={target_width}x{target_height}, quality={jpeg_quality})"
        )

    def _get_sct(self):
        """Get or create the MSS screen capture instance."""
        if self._sct is None:
            mss = _get_mss()
            self._sct = mss.mss()
            self._monitors = list(self._sct.monitors)
            logger.debug(f"MSS initialized with {len(self._monitors) - 1} monitors")
        return self._sct

    def capture_screen(
        self,
        monitor: int = 0,
        region: tuple[int, int, int, int] | None = None,
        scale: bool = True,
    ) -> ScreenCapture:
        """Capture the screen or a region.

        Args:
            monitor: Monitor index (0=all monitors combined, 1+=specific monitor).
            region: Optional (x, y, width, height) region to capture.
            scale: Whether to scale the image.

        Returns:
            ScreenCapture with base64 encoded image and metadata.
        """
        sct = self._get_sct()
        Image = _get_pil()

        # Determine capture region
        if region:
            capture_region = {
                "left": region[0],
                "top": region[1],
                "width": region[2],
                "height": region[3],
            }
        else:
            # Use monitor bounds
            if monitor < len(self._monitors):
                capture_region = self._monitors[monitor]
            else:
                logger.warning(f"Monitor {monitor} not found, using primary (index 1)")
                capture_region = (
                    self._monitors[1] if len(self._monitors) > 1 else self._monitors[0]
                )

        # Capture screenshot
        screenshot = sct.grab(capture_region)
        original_width = screenshot.width
        original_height = screenshot.height

        # Convert to PIL Image
        img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

        # Scale if requested
        if scale and (self.target_width or self.target_height):
            img, new_width, new_height = self._scale_image(img)
        elif scale:
            new_width = int(original_width * self.scale_factor)
            new_height = int(original_height * self.scale_factor)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        else:
            new_width, new_height = original_width, original_height

        # Encode to base64
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=self.jpeg_quality)
        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return ScreenCapture(
            image_base64=image_base64,
            width=new_width,
            height=new_height,
            monitor=monitor,
            scaled=scale,
            original_width=original_width,
            original_height=original_height,
        )

    def _scale_image(self, img) -> tuple[Any, int, int]:
        """Scale image to target dimensions while maintaining aspect ratio.

        Args:
            img: PIL Image to scale.

        Returns:
            Tuple of (scaled_image, new_width, new_height).
        """
        Image = _get_pil()
        original_width, original_height = img.size

        if self.target_width and self.target_height:
            # Scale to fit within target dimensions
            width_ratio = self.target_width / original_width
            height_ratio = self.target_height / original_height
            ratio = min(width_ratio, height_ratio)
        elif self.target_width:
            ratio = self.target_width / original_width
        elif self.target_height:
            ratio = self.target_height / original_height
        else:
            ratio = self.scale_factor

        new_width = int(original_width * ratio)
        new_height = int(original_height * ratio)

        scaled_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        return scaled_img, new_width, new_height

    def get_image_for_llm(
        self,
        monitor: int = 0,
        region: tuple[int, int, int, int] | None = None,
    ) -> dict[str, Any]:
        """Get a screen capture formatted for OpenAI-compatible vision LLMs.

        Args:
            monitor: Monitor index to capture.
            region: Optional region to capture.

        Returns:
            Dictionary with image_url formatted for OpenAI API.
        """
        capture = self.capture_screen(monitor=monitor, region=region, scale=True)

        return {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{capture.image_base64}",
                "detail": "high",
            },
        }

    def capture_for_analysis(
        self,
        monitor: int = 0,
    ) -> tuple[ScreenCapture, dict[str, Any]]:
        """Capture screen and return both raw data and LLM-formatted image.

        Args:
            monitor: Monitor index to capture.

        Returns:
            Tuple of (ScreenCapture, LLM-formatted image dict).
        """
        capture = self.capture_screen(monitor=monitor, scale=True)

        llm_image = {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{capture.image_base64}",
                "detail": "high",
            },
        }

        return capture, llm_image

    def get_monitors(self) -> list[dict[str, int]]:
        """Get list of available monitors.

        Returns:
            List of monitor dictionaries with bounds.
        """
        self._get_sct()  # Ensure initialized
        return self._monitors.copy()

    def get_screen_dimensions(self, monitor: int = 1) -> tuple[int, int]:
        """Get dimensions of a specific monitor.

        Args:
            monitor: Monitor index (1=primary, 2+=additional).

        Returns:
            Tuple of (width, height) in pixels.
        """
        self._get_sct()
        if monitor < len(self._monitors):
            m = self._monitors[monitor]
            return (m["width"], m["height"])
        return (1920, 1080)  # Default fallback

    def coords_to_original(
        self,
        scaled_x: int,
        scaled_y: int,
        capture: ScreenCapture,
    ) -> tuple[int, int]:
        """Convert scaled coordinates back to original screen coordinates.

        Args:
            scaled_x: X coordinate in scaled image.
            scaled_y: Y coordinate in scaled image.
            capture: The ScreenCapture these coordinates are from.

        Returns:
            Tuple of (original_x, original_y) in screen coordinates.
        """
        if not capture.scaled or not capture.original_width:
            return (scaled_x, scaled_y)

        scale_x = capture.original_width / capture.width
        scale_y = capture.original_height / capture.height

        original_x = int(scaled_x * scale_x)
        original_y = int(scaled_y * scale_y)

        return (original_x, original_y)

    def close(self) -> None:
        """Close the screen capture resources."""
        if self._sct:
            self._sct.close()
            self._sct = None
            logger.debug("VisionEngine closed")
