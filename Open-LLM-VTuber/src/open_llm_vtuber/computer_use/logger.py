"""ActionLogger for comprehensive audit logging.

This module provides logging functionality for all computer use actions,
enabling audit trails and user review of agent behavior.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from loguru import logger

from .types import ActionResult, ScreenCapture


class ActionLogger:
    """Logs all computer use actions for audit and review.

    This class provides comprehensive logging of all actions taken by
    the computer use agent, including optional screenshot storage.

    Attributes:
        log_dir: Directory for storing logs.
        log_screenshots: Whether to save screenshots.
        session_id: Current session identifier.
    """

    def __init__(
        self,
        log_dir: str | Path = "logs/computer_use",
        log_screenshots: bool = False,
        max_log_size_mb: int = 100,
    ):
        """Initialize the ActionLogger.

        Args:
            log_dir: Directory to store log files.
            log_screenshots: Whether to save screenshots with logs.
            max_log_size_mb: Maximum size of log directory in MB.
        """
        self.log_dir = Path(log_dir)
        self.log_screenshots = log_screenshots
        self.max_log_size_mb = max_log_size_mb
        self.session_id: str | None = None

        self._current_session_dir: Path | None = None
        self._action_log_file: Path | None = None
        self._action_count: int = 0

        # Ensure log directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)

        logger.info(
            f"ActionLogger initialized (dir={log_dir}, screenshots={log_screenshots})"
        )

    def start_session(self, session_id: str, user_goal: str) -> None:
        """Start logging a new session.

        Args:
            session_id: Unique session identifier.
            user_goal: The user's stated goal for this session.
        """
        self.session_id = session_id
        self._action_count = 0

        # Create session directory
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        session_dir_name = f"{timestamp}_{session_id[:8]}"
        self._current_session_dir = self.log_dir / session_dir_name
        self._current_session_dir.mkdir(parents=True, exist_ok=True)

        # Create action log file
        self._action_log_file = self._current_session_dir / "actions.jsonl"

        # Write session start
        session_start = {
            "event": "session_start",
            "session_id": session_id,
            "user_goal": user_goal,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._write_log_entry(session_start)

        logger.info(
            f"Started logging session {session_id} to {self._current_session_dir}"
        )

    def end_session(
        self,
        success: bool = False,
        reason: str | None = None,
    ) -> None:
        """End the current logging session.

        Args:
            success: Whether the session achieved its goal.
            reason: Reason for ending (e.g., "completed", "timeout", "kill_switch").
        """
        if not self.session_id:
            return

        session_end = {
            "event": "session_end",
            "session_id": self.session_id,
            "success": success,
            "reason": reason,
            "total_actions": self._action_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._write_log_entry(session_end)

        logger.info(
            f"Ended session {self.session_id} "
            f"(success={success}, actions={self._action_count})"
        )

        self.session_id = None
        self._current_session_dir = None
        self._action_log_file = None

    def log_action(
        self,
        result: ActionResult,
        llm_reasoning: str | None = None,
        screenshot_before: ScreenCapture | None = None,
        screenshot_after: ScreenCapture | None = None,
    ) -> None:
        """Log an executed action.

        Args:
            result: The result of the action execution.
            llm_reasoning: The LLM's reasoning for this action.
            screenshot_before: Screenshot taken before the action.
            screenshot_after: Screenshot taken after the action.
        """
        if not self.session_id:
            logger.warning("Attempted to log action without active session")
            return

        self._action_count += 1

        entry = {
            "event": "action",
            "session_id": self.session_id,
            "action_number": self._action_count,
            "action_type": result.action_type.value,
            "success": result.success,
            "error_message": result.error_message,
            "action_data": result.action_data,
            "llm_reasoning": llm_reasoning,
            "timestamp": result.timestamp.isoformat(),
        }

        # Save screenshots if enabled
        if self.log_screenshots and self._current_session_dir:
            if screenshot_before:
                before_path = self._save_screenshot(
                    screenshot_before, f"action_{self._action_count:04d}_before"
                )
                entry["screenshot_before"] = (
                    str(before_path.name) if before_path else None
                )

            if screenshot_after:
                after_path = self._save_screenshot(
                    screenshot_after, f"action_{self._action_count:04d}_after"
                )
                entry["screenshot_after"] = str(after_path.name) if after_path else None

        self._write_log_entry(entry)

    def log_llm_request(
        self,
        prompt: str,
        screenshot: ScreenCapture | None = None,
    ) -> None:
        """Log an LLM request.

        Args:
            prompt: The prompt sent to the LLM.
            screenshot: The screenshot sent with the request.
        """
        if not self.session_id:
            return

        entry = {
            "event": "llm_request",
            "session_id": self.session_id,
            "prompt_length": len(prompt),
            "has_screenshot": screenshot is not None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        self._write_log_entry(entry)

    def log_llm_response(
        self,
        response: str,
        parsed_action: dict[str, Any] | None = None,
    ) -> None:
        """Log an LLM response.

        Args:
            response: The raw response from the LLM.
            parsed_action: The parsed action from the response.
        """
        if not self.session_id:
            return

        entry = {
            "event": "llm_response",
            "session_id": self.session_id,
            "response_length": len(response),
            "parsed_action": parsed_action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        self._write_log_entry(entry)

    def log_error(
        self,
        error_type: str,
        error_message: str,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Log an error event.

        Args:
            error_type: Type of error (e.g., "execution", "parsing", "safety").
            error_message: Error message.
            context: Additional context about the error.
        """
        entry = {
            "event": "error",
            "session_id": self.session_id,
            "error_type": error_type,
            "error_message": error_message,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        self._write_log_entry(entry)
        logger.error(f"Computer use error ({error_type}): {error_message}")

    def log_safety_event(
        self,
        event_type: str,
        details: str | None = None,
    ) -> None:
        """Log a safety-related event.

        Args:
            event_type: Type of safety event (e.g., "kill_switch", "rate_limit").
            details: Additional details about the event.
        """
        entry = {
            "event": "safety",
            "session_id": self.session_id,
            "safety_event_type": event_type,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        self._write_log_entry(entry)
        logger.warning(f"Safety event ({event_type}): {details}")

    def _write_log_entry(self, entry: dict[str, Any]) -> None:
        """Write a log entry to the JSONL file.

        Args:
            entry: Dictionary to write as JSON.
        """
        if not self._action_log_file:
            return

        try:
            with open(self._action_log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.error(f"Failed to write log entry: {e}")

    def _save_screenshot(
        self,
        capture: ScreenCapture,
        filename_prefix: str,
    ) -> Path | None:
        """Save a screenshot to the session directory.

        Args:
            capture: The screenshot to save.
            filename_prefix: Prefix for the filename.

        Returns:
            Path to saved file, or None if failed.
        """
        if not self._current_session_dir:
            return None

        try:
            import base64

            filepath = self._current_session_dir / f"{filename_prefix}.jpg"
            image_data = base64.b64decode(capture.image_base64)

            with open(filepath, "wb") as f:
                f.write(image_data)

            return filepath

        except Exception as e:
            logger.error(f"Failed to save screenshot: {e}")
            return None

    def get_session_log_path(self) -> Path | None:
        """Get the path to the current session log.

        Returns:
            Path to the session log directory, or None if no session.
        """
        return self._current_session_dir

    def cleanup_old_logs(self, max_age_days: int = 30) -> int:
        """Clean up old log directories.

        Args:
            max_age_days: Delete logs older than this many days.

        Returns:
            Number of directories deleted.
        """
        import shutil
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
        deleted_count = 0

        try:
            for item in self.log_dir.iterdir():
                if item.is_dir():
                    # Check modification time
                    mtime = datetime.fromtimestamp(
                        item.stat().st_mtime, tz=timezone.utc
                    )
                    if mtime < cutoff:
                        shutil.rmtree(item)
                        deleted_count += 1
                        logger.debug(f"Deleted old log directory: {item}")

        except Exception as e:
            logger.error(f"Error cleaning up old logs: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old log directories")

        return deleted_count
