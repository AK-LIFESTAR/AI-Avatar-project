"""SafetyManager for kill-switch and safety mechanisms.

This module provides safety features to prevent unintended actions
during computer use sessions, including kill-switch, rate limiting,
and session management.
"""

import time
import threading
from collections import deque
from typing import Callable
from loguru import logger

from .types import KillSwitchCorner

# Lazy import for PyAutoGUI
_pyautogui = None


def _get_pyautogui():
    """Lazily import pyautogui."""
    global _pyautogui
    if _pyautogui is None:
        try:
            import pyautogui

            _pyautogui = pyautogui
        except ImportError:
            raise ImportError("PyAutoGUI is required for safety features.")
    return _pyautogui


class SafetyManager:
    """Manages safety mechanisms for computer use.

    This class provides kill-switch detection, rate limiting, and
    session timeout management to ensure safe operation of the
    computer use agent.

    Attributes:
        kill_switch_corner: Corner that triggers kill switch.
        kill_switch_margin: Pixels from corner to trigger.
        rate_limit: Maximum actions per second.
        session_timeout: Seconds before auto-stop.
    """

    def __init__(
        self,
        kill_switch_corner: KillSwitchCorner = KillSwitchCorner.TOP_LEFT,
        kill_switch_margin: int = 10,
        rate_limit: float = 5.0,
        session_timeout: float = 300.0,
        on_kill_switch: Callable[[], None] | None = None,
    ):
        """Initialize the SafetyManager.

        Args:
            kill_switch_corner: Screen corner that triggers kill switch.
            kill_switch_margin: Pixels from corner edge to trigger.
            rate_limit: Maximum actions allowed per second.
            session_timeout: Seconds of inactivity before auto-stop.
            on_kill_switch: Callback function when kill switch is triggered.
        """
        self.kill_switch_corner = kill_switch_corner
        self.kill_switch_margin = kill_switch_margin
        self.rate_limit = rate_limit
        self.session_timeout = session_timeout
        self.on_kill_switch = on_kill_switch

        # Internal state
        self._action_times: deque[float] = deque(maxlen=100)
        self._session_start: float | None = None
        self._last_action_time: float | None = None
        self._is_active: bool = False
        self._kill_switch_triggered: bool = False
        self._monitoring: bool = False
        self._monitor_thread: threading.Thread | None = None
        self._stop_event = threading.Event()

        # Screen dimensions (cached)
        self._screen_width: int = 0
        self._screen_height: int = 0

        logger.info(
            f"SafetyManager initialized (corner={kill_switch_corner.value}, "
            f"rate_limit={rate_limit}/s, timeout={session_timeout}s)"
        )

    def start_session(self) -> None:
        """Start a new computer use session."""
        self._session_start = time.time()
        self._last_action_time = time.time()
        self._is_active = True
        self._kill_switch_triggered = False
        self._action_times.clear()

        # Cache screen dimensions
        try:
            pyautogui = _get_pyautogui()
            size = pyautogui.size()
            self._screen_width = size.width
            self._screen_height = size.height
        except Exception:
            self._screen_width = 1920
            self._screen_height = 1080

        # Start monitoring thread
        self._start_monitoring()

        logger.info("Computer use session started")

    def end_session(self) -> None:
        """End the current computer use session."""
        self._is_active = False
        self._stop_monitoring()
        logger.info("Computer use session ended")

    def _start_monitoring(self) -> None:
        """Start the background monitoring thread."""
        if self._monitoring:
            return

        self._stop_event.clear()
        self._monitoring = True
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            daemon=True,
            name="SafetyMonitor",
        )
        self._monitor_thread.start()

    def _stop_monitoring(self) -> None:
        """Stop the background monitoring thread."""
        self._monitoring = False
        self._stop_event.set()
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=1.0)
        self._monitor_thread = None

    def _monitor_loop(self) -> None:
        """Background loop to check kill switch and timeouts."""
        while self._monitoring and not self._stop_event.is_set():
            try:
                # Check kill switch
                if self._check_kill_switch_position():
                    self._trigger_kill_switch()
                    break

                # Check session timeout
                if self._check_session_timeout():
                    self._trigger_timeout()
                    break

            except Exception as e:
                logger.error(f"Error in safety monitor: {e}")

            # Sleep between checks
            self._stop_event.wait(0.1)

    def _check_kill_switch_position(self) -> bool:
        """Check if mouse is in kill switch corner.

        Returns:
            True if mouse is in kill switch position.
        """
        try:
            pyautogui = _get_pyautogui()
            pos = pyautogui.position()
            x, y = pos.x, pos.y

            margin = self.kill_switch_margin

            if self.kill_switch_corner == KillSwitchCorner.TOP_LEFT:
                return x <= margin and y <= margin
            elif self.kill_switch_corner == KillSwitchCorner.TOP_RIGHT:
                return x >= self._screen_width - margin and y <= margin
            elif self.kill_switch_corner == KillSwitchCorner.BOTTOM_LEFT:
                return x <= margin and y >= self._screen_height - margin
            elif self.kill_switch_corner == KillSwitchCorner.BOTTOM_RIGHT:
                return (
                    x >= self._screen_width - margin
                    and y >= self._screen_height - margin
                )

        except Exception:
            pass

        return False

    def _check_session_timeout(self) -> bool:
        """Check if session has timed out.

        Returns:
            True if session has exceeded timeout.
        """
        if not self._last_action_time:
            return False

        elapsed = time.time() - self._last_action_time
        return elapsed > self.session_timeout

    def _trigger_kill_switch(self) -> None:
        """Handle kill switch activation."""
        if self._kill_switch_triggered:
            return

        self._kill_switch_triggered = True
        self._is_active = False
        logger.warning(
            f"KILL SWITCH TRIGGERED! Mouse moved to {self.kill_switch_corner.value} corner"
        )

        if self.on_kill_switch:
            try:
                self.on_kill_switch()
            except Exception as e:
                logger.error(f"Error in kill switch callback: {e}")

    def _trigger_timeout(self) -> None:
        """Handle session timeout."""
        self._is_active = False
        logger.warning(f"Session timeout after {self.session_timeout}s of inactivity")

        if self.on_kill_switch:
            try:
                self.on_kill_switch()
            except Exception as e:
                logger.error(f"Error in timeout callback: {e}")

    def can_execute_action(self) -> tuple[bool, str]:
        """Check if an action can be executed.

        Returns:
            Tuple of (can_execute, reason_if_not).
        """
        # Check if session is active
        if not self._is_active:
            return False, "Session is not active"

        # Check if kill switch was triggered
        if self._kill_switch_triggered:
            return False, "Kill switch was triggered"

        # Check rate limit
        if not self._check_rate_limit():
            return False, f"Rate limit exceeded ({self.rate_limit}/s)"

        return True, ""

    def _check_rate_limit(self) -> bool:
        """Check if action rate is within limits.

        Returns:
            True if within rate limit.
        """
        now = time.time()

        # Remove old action times (older than 1 second)
        while self._action_times and now - self._action_times[0] > 1.0:
            self._action_times.popleft()

        # Check if we're under the limit
        return len(self._action_times) < self.rate_limit

    def record_action(self) -> None:
        """Record that an action was executed."""
        now = time.time()
        self._action_times.append(now)
        self._last_action_time = now

    def is_active(self) -> bool:
        """Check if session is active.

        Returns:
            True if session is active and not killed.
        """
        return self._is_active and not self._kill_switch_triggered

    def is_kill_switch_triggered(self) -> bool:
        """Check if kill switch was triggered.

        Returns:
            True if kill switch was triggered.
        """
        return self._kill_switch_triggered

    def get_session_duration(self) -> float:
        """Get current session duration in seconds.

        Returns:
            Session duration in seconds, or 0 if no session.
        """
        if not self._session_start:
            return 0.0
        return time.time() - self._session_start

    def get_action_count(self) -> int:
        """Get number of actions in the rate limit window.

        Returns:
            Number of recent actions.
        """
        return len(self._action_times)

    def reset(self) -> None:
        """Reset the safety manager state."""
        self._stop_monitoring()
        self._session_start = None
        self._last_action_time = None
        self._is_active = False
        self._kill_switch_triggered = False
        self._action_times.clear()
        logger.info("SafetyManager reset")

