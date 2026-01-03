"""Computer Use module for AI-controlled PC automation.

This module provides a framework for vision-based LLMs to control
the user's computer through mouse/keyboard actions based on screen analysis.

Components:
- ActionHandler: Translates JSON commands into system events
- VisionEngine: Captures screen and communicates with vision LLMs
- SafetyManager: Implements kill-switch and safety mechanisms
- ExecutionLoop: Main agentic loop for capture-analyze-act cycle
- ActionLogger: Comprehensive logging for audit trails
"""

from .types import (
    ActionType,
    ClickAction,
    TypeAction,
    HotkeyAction,
    ScrollAction,
    MoveAction,
    DragAction,
    ScreenshotAction,
    WaitAction,
    ComputerAction,
    ActionResult,
    ScreenCapture,
    KillSwitchCorner,
    LLMActionResponse,
    SessionState,
)
from .action_handler import ActionHandler
from .vision_engine import VisionEngine
from .safety import SafetyManager
from .logger import ActionLogger
from .execution_loop import ExecutionLoop
from .session import ComputerUseSession
from .window_manager import WindowManager, WindowInfo

__all__ = [
    # Types
    "ActionType",
    "ClickAction",
    "TypeAction",
    "HotkeyAction",
    "ScrollAction",
    "MoveAction",
    "DragAction",
    "ScreenshotAction",
    "WaitAction",
    "ComputerAction",
    "ActionResult",
    "ScreenCapture",
    "KillSwitchCorner",
    "LLMActionResponse",
    "SessionState",
    # Core Components
    "ActionHandler",
    "VisionEngine",
    "SafetyManager",
    "ActionLogger",
    "ExecutionLoop",
    "ComputerUseSession",
    "WindowManager",
    "WindowInfo",
]
