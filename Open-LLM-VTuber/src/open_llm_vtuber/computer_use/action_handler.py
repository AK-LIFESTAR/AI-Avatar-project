"""ActionHandler for translating JSON commands into system events.

This module provides the ActionHandler class that uses PyAutoGUI to
execute mouse and keyboard actions based on JSON command structures.
"""

import time
from typing import Any
from loguru import logger

from .types import (
    ActionType,
    ActionResult,
    ClickAction,
    TypeAction,
    HotkeyAction,
    ScrollAction,
    MoveAction,
    DragAction,
    ScreenshotAction,
    WaitAction,
    ComputerAction,
)

# Lazy import for PyAutoGUI to handle missing dependency gracefully
_pyautogui = None


def _get_pyautogui():
    """Lazily import pyautogui to handle missing dependency."""
    global _pyautogui
    if _pyautogui is None:
        try:
            import pyautogui

            # Configure PyAutoGUI safety settings
            pyautogui.FAILSAFE = True  # Move mouse to corner to abort
            pyautogui.PAUSE = 0.1  # Small pause between actions
            _pyautogui = pyautogui
        except ImportError:
            raise ImportError(
                "PyAutoGUI is required for computer use. Install with: uv add pyautogui"
            )
    return _pyautogui


class ActionHandler:
    """Translates JSON commands into system events using PyAutoGUI.

    This class provides a safe interface for executing mouse and keyboard
    actions. All actions are validated before execution and results are
    returned with detailed status information.

    Attributes:
        enabled: Whether action execution is enabled.
        dry_run: If True, actions are logged but not executed.
    """

    def __init__(self, enabled: bool = True, dry_run: bool = False):
        """Initialize the ActionHandler.

        Args:
            enabled: Whether to enable action execution.
            dry_run: If True, log actions without executing them.
        """
        self.enabled = enabled
        self.dry_run = dry_run
        self._last_action_time: float = 0.0

        if enabled and not dry_run:
            # Verify PyAutoGUI is available
            _get_pyautogui()
            logger.info("ActionHandler initialized with PyAutoGUI")
        else:
            logger.info(
                f"ActionHandler initialized (enabled={enabled}, dry_run={dry_run})"
            )

    def execute(self, action: ComputerAction | dict[str, Any]) -> ActionResult:
        """Execute a computer action.

        Args:
            action: The action to execute, either as a Pydantic model or dict.

        Returns:
            ActionResult with success status and any error information.
        """
        # Parse action if it's a dictionary
        if isinstance(action, dict):
            action = self._parse_action(action)

        if not self.enabled:
            return ActionResult(
                success=False,
                action_type=ActionType(action.action),
                error_message="ActionHandler is disabled",
                action_data=action.model_dump(),
            )

        if self.dry_run:
            logger.info(f"[DRY RUN] Would execute: {action}")
            return ActionResult(
                success=True,
                action_type=ActionType(action.action),
                action_data=action.model_dump(),
            )

        try:
            self._last_action_time = time.time()

            if isinstance(action, ClickAction):
                return self._execute_click(action)
            elif isinstance(action, TypeAction):
                return self._execute_type(action)
            elif isinstance(action, HotkeyAction):
                return self._execute_hotkey(action)
            elif isinstance(action, ScrollAction):
                return self._execute_scroll(action)
            elif isinstance(action, MoveAction):
                return self._execute_move(action)
            elif isinstance(action, DragAction):
                return self._execute_drag(action)
            elif isinstance(action, ScreenshotAction):
                return self._execute_screenshot(action)
            elif isinstance(action, WaitAction):
                return self._execute_wait(action)
            else:
                return ActionResult(
                    success=False,
                    action_type=ActionType.CLICK,  # Fallback
                    error_message=f"Unknown action type: {type(action)}",
                    action_data=action.model_dump()
                    if hasattr(action, "model_dump")
                    else None,
                )

        except Exception as e:
            logger.error(f"Action execution failed: {e}")
            return ActionResult(
                success=False,
                action_type=ActionType(action.action),
                error_message=str(e),
                action_data=action.model_dump(),
            )

    def _parse_action(self, action_dict: dict[str, Any]) -> ComputerAction:
        """Parse a dictionary into the appropriate action type.

        Args:
            action_dict: Dictionary containing action data.

        Returns:
            Parsed action as a Pydantic model.

        Raises:
            ValueError: If action type is unknown or invalid.
        """
        action_type = action_dict.get("action")

        if action_type == "click":
            return ClickAction(**action_dict)
        elif action_type == "type":
            return TypeAction(**action_dict)
        elif action_type == "hotkey":
            return HotkeyAction(**action_dict)
        elif action_type == "scroll":
            return ScrollAction(**action_dict)
        elif action_type == "move":
            return MoveAction(**action_dict)
        elif action_type == "drag":
            return DragAction(**action_dict)
        elif action_type == "screenshot":
            return ScreenshotAction(**action_dict)
        elif action_type == "wait":
            return WaitAction(**action_dict)
        else:
            raise ValueError(f"Unknown action type: {action_type}")

    def _execute_click(self, action: ClickAction) -> ActionResult:
        """Execute a click action.

        Args:
            action: Click action parameters.

        Returns:
            ActionResult with execution status.
        """
        pyautogui = _get_pyautogui()
        x, y = action.coords

        logger.debug(
            f"Clicking at ({x}, {y}) with {action.button} button, {action.clicks} click(s)"
        )

        pyautogui.click(
            x=x,
            y=y,
            button=action.button,
            clicks=action.clicks,
        )

        return ActionResult(
            success=True,
            action_type=ActionType.CLICK,
            action_data=action.model_dump(),
        )

    def _execute_type(self, action: TypeAction) -> ActionResult:
        """Execute a type action.

        Args:
            action: Type action parameters.

        Returns:
            ActionResult with execution status.
        """
        pyautogui = _get_pyautogui()

        logger.debug(f"Typing text: {action.text[:50]}...")

        # Use write() for better Unicode support on macOS
        pyautogui.write(
            action.text,
            interval=action.interval,
        )

        # Press Enter if requested
        if action.press_enter:
            pyautogui.press("enter")

        return ActionResult(
            success=True,
            action_type=ActionType.TYPE,
            action_data=action.model_dump(),
        )

    def _execute_hotkey(self, action: HotkeyAction) -> ActionResult:
        """Execute a hotkey action.

        Args:
            action: Hotkey action parameters.

        Returns:
            ActionResult with execution status.
        """
        pyautogui = _get_pyautogui()

        logger.debug(f"Pressing hotkey: {'+'.join(action.keys)}")

        pyautogui.hotkey(*action.keys)

        return ActionResult(
            success=True,
            action_type=ActionType.HOTKEY,
            action_data=action.model_dump(),
        )

    def _execute_scroll(self, action: ScrollAction) -> ActionResult:
        """Execute a scroll action.

        Args:
            action: Scroll action parameters.

        Returns:
            ActionResult with execution status.
        """
        pyautogui = _get_pyautogui()

        # Calculate scroll amount based on direction
        amount = action.amount
        if action.direction == "down":
            amount = -abs(amount)  # Negative = scroll down
        elif action.direction == "up":
            amount = abs(amount)  # Positive = scroll up
        elif action.direction == "left":
            # Horizontal scroll (if supported)
            amount = -abs(amount)
        elif action.direction == "right":
            amount = abs(amount)

        if action.coords:
            x, y = action.coords
            logger.debug(f"Scrolling {action.direction} ({amount}) at ({x}, {y})")
            if action.direction in ["left", "right"]:
                pyautogui.hscroll(amount, x=x, y=y)
            else:
                pyautogui.scroll(amount, x=x, y=y)
        else:
            logger.debug(f"Scrolling {action.direction} ({amount}) at current position")
            if action.direction in ["left", "right"]:
                pyautogui.hscroll(amount)
            else:
                pyautogui.scroll(amount)

        return ActionResult(
            success=True,
            action_type=ActionType.SCROLL,
            action_data=action.model_dump(),
        )

    def _execute_move(self, action: MoveAction) -> ActionResult:
        """Execute a move action.

        Args:
            action: Move action parameters.

        Returns:
            ActionResult with execution status.
        """
        pyautogui = _get_pyautogui()
        x, y = action.coords

        logger.debug(f"Moving mouse to ({x}, {y}) over {action.duration}s")

        pyautogui.moveTo(x=x, y=y, duration=action.duration)

        return ActionResult(
            success=True,
            action_type=ActionType.MOVE,
            action_data=action.model_dump(),
        )

    def _execute_drag(self, action: DragAction) -> ActionResult:
        """Execute a drag action.

        Args:
            action: Drag action parameters.

        Returns:
            ActionResult with execution status.
        """
        pyautogui = _get_pyautogui()
        start_x, start_y = action.start
        end_x, end_y = action.end

        logger.debug(
            f"Dragging from ({start_x}, {start_y}) to ({end_x}, {end_y}) "
            f"with {action.button} button over {action.duration}s"
        )

        # Move to start position
        pyautogui.moveTo(x=start_x, y=start_y)

        # Perform drag
        pyautogui.drag(
            xOffset=end_x - start_x,
            yOffset=end_y - start_y,
            duration=action.duration,
            button=action.button,
        )

        return ActionResult(
            success=True,
            action_type=ActionType.DRAG,
            action_data=action.model_dump(),
        )

    def _execute_screenshot(self, action: ScreenshotAction) -> ActionResult:
        """Execute a screenshot action.

        Note: This returns an ActionResult but the actual screenshot
        should be obtained through the VisionEngine.

        Args:
            action: Screenshot action parameters.

        Returns:
            ActionResult with execution status.
        """
        logger.debug(f"Screenshot requested for monitor {action.monitor}")

        # Screenshot is handled by VisionEngine, this just validates the request
        return ActionResult(
            success=True,
            action_type=ActionType.SCREENSHOT,
            action_data=action.model_dump(),
        )

    def _execute_wait(self, action: WaitAction) -> ActionResult:
        """Execute a wait action.

        Args:
            action: Wait action parameters.

        Returns:
            ActionResult with execution status.
        """
        logger.debug(f"Waiting for {action.duration} seconds")

        time.sleep(action.duration)

        return ActionResult(
            success=True,
            action_type=ActionType.WAIT,
            action_data=action.model_dump(),
        )

    def get_mouse_position(self) -> tuple[int, int]:
        """Get the current mouse position.

        Returns:
            Tuple of (x, y) coordinates.
        """
        pyautogui = _get_pyautogui()
        pos = pyautogui.position()
        return (pos.x, pos.y)

    def get_screen_size(self) -> tuple[int, int]:
        """Get the screen size.

        Returns:
            Tuple of (width, height) in pixels.
        """
        pyautogui = _get_pyautogui()
        size = pyautogui.size()
        return (size.width, size.height)

    def disable(self) -> None:
        """Disable action execution."""
        self.enabled = False
        logger.warning("ActionHandler disabled")

    def enable(self) -> None:
        """Enable action execution."""
        self.enabled = True
        logger.info("ActionHandler enabled")
