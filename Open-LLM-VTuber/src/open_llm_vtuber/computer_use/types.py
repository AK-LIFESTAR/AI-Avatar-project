"""Type definitions for the Computer Use module.

This module contains Pydantic models and type definitions for all
computer control actions, results, and configuration.
"""

from enum import Enum
from typing import Literal, Union
from pydantic import BaseModel, Field
import datetime


class ActionType(str, Enum):
    """Supported action types for computer control."""

    CLICK = "click"
    TYPE = "type"
    HOTKEY = "hotkey"
    SCROLL = "scroll"
    MOVE = "move"
    DRAG = "drag"
    SCREENSHOT = "screenshot"
    WAIT = "wait"


class KillSwitchCorner(str, Enum):
    """Screen corners for kill switch activation."""

    TOP_LEFT = "top_left"
    TOP_RIGHT = "top_right"
    BOTTOM_LEFT = "bottom_left"
    BOTTOM_RIGHT = "bottom_right"


class ClickAction(BaseModel):
    """Click action at specified coordinates."""

    action: Literal["click"] = "click"
    coords: tuple[int, int] = Field(..., description="(x, y) coordinates to click")
    button: Literal["left", "right", "middle"] = Field(
        default="left", description="Mouse button to click"
    )
    clicks: int = Field(default=1, ge=1, le=3, description="Number of clicks (1-3)")


class TypeAction(BaseModel):
    """Type text action."""

    action: Literal["type"] = "type"
    text: str = Field(..., description="Text to type")
    interval: float = Field(
        default=0.0, ge=0.0, description="Interval between keystrokes in seconds"
    )
    press_enter: bool = Field(
        default=False, description="Whether to press Enter after typing"
    )


class HotkeyAction(BaseModel):
    """Hotkey combination action."""

    action: Literal["hotkey"] = "hotkey"
    keys: list[str] = Field(
        ..., description="Keys to press simultaneously (e.g., ['ctrl', 'c'])"
    )


class ScrollAction(BaseModel):
    """Scroll action at specified coordinates."""

    action: Literal["scroll"] = "scroll"
    amount: int = Field(default=3, description="Scroll amount (number of units)")
    direction: Literal["up", "down", "left", "right"] = Field(
        default="down", description="Scroll direction"
    )
    coords: tuple[int, int] | None = Field(
        default=None, description="(x, y) coordinates to scroll at"
    )


class MoveAction(BaseModel):
    """Move mouse to specified coordinates."""

    action: Literal["move"] = "move"
    coords: tuple[int, int] = Field(..., description="(x, y) coordinates to move to")
    duration: float = Field(
        default=0.0, ge=0.0, description="Duration of movement in seconds"
    )


class DragAction(BaseModel):
    """Drag from one point to another."""

    action: Literal["drag"] = "drag"
    start: tuple[int, int] = Field(..., description="(x, y) start coordinates")
    end: tuple[int, int] = Field(..., description="(x, y) end coordinates")
    button: Literal["left", "right", "middle"] = Field(
        default="left", description="Mouse button for drag"
    )
    duration: float = Field(
        default=0.5, ge=0.0, description="Duration of drag in seconds"
    )


class ScreenshotAction(BaseModel):
    """Take a screenshot of a specific region."""

    action: Literal["screenshot"] = "screenshot"
    region: tuple[int, int, int, int] | None = Field(
        default=None, description="(x, y, width, height) region to capture, None=full"
    )
    monitor: int = Field(default=0, ge=0, description="Monitor index (0=primary)")


class WaitAction(BaseModel):
    """Wait for a specified duration."""

    action: Literal["wait"] = "wait"
    duration: float = Field(
        default=1.0, ge=0.0, le=30.0, description="Duration to wait in seconds"
    )
    seconds: float | None = Field(default=None, description="Alias for duration")

    def model_post_init(self, __context) -> None:
        """Use seconds as alias for duration."""
        if self.seconds is not None:
            object.__setattr__(self, "duration", self.seconds)


# Union type for all possible actions
ComputerAction = Union[
    ClickAction,
    TypeAction,
    HotkeyAction,
    ScrollAction,
    MoveAction,
    DragAction,
    ScreenshotAction,
    WaitAction,
]


class ActionResult(BaseModel):
    """Result of an executed action."""

    success: bool = Field(..., description="Whether the action was successful")
    action_type: ActionType = Field(..., description="Type of action executed")
    timestamp: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
        description="When the action was executed",
    )
    error_message: str | None = Field(
        default=None, description="Error message if action failed"
    )
    screenshot_before: str | None = Field(
        default=None, description="Base64 encoded screenshot before action"
    )
    screenshot_after: str | None = Field(
        default=None, description="Base64 encoded screenshot after action"
    )
    action_data: dict | None = Field(
        default=None, description="Original action parameters"
    )


class ScreenCapture(BaseModel):
    """Screen capture data."""

    image_base64: str = Field(..., description="Base64 encoded PNG image")
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    monitor: int = Field(default=0, description="Monitor index captured")
    timestamp: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
        description="When the capture was taken",
    )
    scaled: bool = Field(default=False, description="Whether image was scaled")
    original_width: int | None = Field(
        default=None, description="Original width before scaling"
    )
    original_height: int | None = Field(
        default=None, description="Original height before scaling"
    )


class LLMActionResponse(BaseModel):
    """Response from the vision LLM containing next action."""

    thought: str = Field(
        ..., description="LLM's reasoning about the current screen state"
    )
    action: ComputerAction = Field(..., description="Next action to execute")
    goal_completed: bool = Field(
        default=False, description="Whether the user's goal has been achieved"
    )
    confidence: float = Field(
        default=1.0, ge=0.0, le=1.0, description="Confidence in the action"
    )


class SessionState(BaseModel):
    """State of a computer use session."""

    session_id: str = Field(..., description="Unique session identifier")
    user_goal: str = Field(..., description="User's stated goal")
    started_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
        description="When the session started",
    )
    action_count: int = Field(default=0, description="Number of actions executed")
    is_active: bool = Field(default=True, description="Whether session is active")
    last_action_at: datetime.datetime | None = Field(
        default=None, description="When the last action was executed"
    )
    error_count: int = Field(default=0, description="Number of errors encountered")
