"""ExecutionLoop for the capture-analyze-act cycle.

This module provides the main execution loop that orchestrates screen
capture, LLM analysis, and action execution for computer use.
"""

import json
import uuid
import asyncio
from typing import Any, AsyncIterator
from loguru import logger

from .types import (
    LLMActionResponse,
    SessionState,
)
from .action_handler import ActionHandler
from .vision_engine import VisionEngine
from .safety import SafetyManager
from .logger import ActionLogger
from .prompts import (
    COMPUTER_USE_SYSTEM_PROMPT,
    build_user_message,
)


class ExecutionLoop:
    """Main execution loop for computer use.

    This class orchestrates the capture-analyze-act cycle:
    1. Capture the current screen state
    2. Send screenshot + goal to vision LLM
    3. Parse the LLM's action response
    4. Execute the action
    5. Verify and repeat

    Attributes:
        action_handler: Handler for executing actions.
        vision_engine: Engine for screen capture.
        safety_manager: Manager for safety mechanisms.
        action_logger: Logger for audit trails.
    """

    def __init__(
        self,
        action_handler: ActionHandler | None = None,
        vision_engine: VisionEngine | None = None,
        safety_manager: SafetyManager | None = None,
        action_logger: ActionLogger | None = None,
        max_actions_per_session: int = 50,
        verify_after_action: bool = True,
    ):
        """Initialize the ExecutionLoop.

        Args:
            action_handler: Handler for executing actions.
            vision_engine: Engine for screen capture.
            safety_manager: Manager for safety mechanisms.
            action_logger: Logger for audit trails.
            max_actions_per_session: Maximum actions before auto-stop.
            verify_after_action: Whether to capture screenshot after each action.
        """
        self.action_handler = action_handler or ActionHandler()
        self.vision_engine = vision_engine or VisionEngine()
        self.safety_manager = safety_manager or SafetyManager(
            on_kill_switch=self._on_kill_switch
        )
        self.action_logger = action_logger or ActionLogger()

        self.max_actions_per_session = max_actions_per_session
        self.verify_after_action = verify_after_action

        self._current_session: SessionState | None = None
        self._action_history: list[dict[str, Any]] = []
        self._llm_chat_func = None
        self._stop_requested: bool = False

        logger.info("ExecutionLoop initialized")

    def set_llm_chat_function(self, chat_func) -> None:
        """Set the LLM chat function for analysis.

        Args:
            chat_func: Async function that takes messages and returns LLM response.
                      Should accept (messages, system_prompt) and return string.
        """
        self._llm_chat_func = chat_func
        logger.debug("LLM chat function configured")

    async def run_session(
        self,
        user_goal: str,
        llm_chat_func=None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Run a computer use session.

        Args:
            user_goal: The user's goal to accomplish.
            llm_chat_func: Optional LLM chat function (overrides set function).

        Yields:
            Status updates and action results as dictionaries.
        """
        if llm_chat_func:
            self._llm_chat_func = llm_chat_func

        if not self._llm_chat_func:
            yield {
                "type": "error",
                "message": "No LLM chat function configured",
            }
            return

        # Start session
        session_id = str(uuid.uuid4())
        self._current_session = SessionState(
            session_id=session_id,
            user_goal=user_goal,
        )
        self._action_history.clear()
        self._stop_requested = False

        # Initialize components
        self.safety_manager.start_session()
        self.action_logger.start_session(session_id, user_goal)

        yield {
            "type": "session_start",
            "session_id": session_id,
            "goal": user_goal,
        }

        try:
            # Main execution loop
            while (
                self._current_session.is_active
                and not self._stop_requested
                and self._current_session.action_count < self.max_actions_per_session
            ):
                # Check safety
                can_execute, reason = self.safety_manager.can_execute_action()
                if not can_execute:
                    yield {
                        "type": "safety_stop",
                        "reason": reason,
                    }
                    break

                # Capture screen
                yield {"type": "status", "message": "Capturing screen..."}
                capture, llm_image = self.vision_engine.capture_for_analysis()

                # Build messages for LLM
                user_message = build_user_message(
                    goal=user_goal,
                    action_history=self._action_history,
                )

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_message},
                            llm_image,
                        ],
                    }
                ]

                # Log LLM request
                self.action_logger.log_llm_request(user_message, capture)

                # Get LLM response
                yield {"type": "status", "message": "Analyzing screen..."}

                try:
                    llm_response = await self._call_llm(
                        messages, COMPUTER_USE_SYSTEM_PROMPT
                    )
                except Exception as e:
                    logger.error(f"LLM call failed: {e}")
                    self.action_logger.log_error("llm_error", str(e))
                    yield {"type": "error", "message": f"LLM error: {e}"}
                    break

                # Parse LLM response
                try:
                    parsed_response = self._parse_llm_response(llm_response)
                    self.action_logger.log_llm_response(
                        llm_response, parsed_response.action.model_dump()
                    )
                except Exception as e:
                    logger.error(f"Failed to parse LLM response: {e}")
                    self.action_logger.log_error(
                        "parse_error", str(e), {"response": llm_response[:500]}
                    )
                    yield {
                        "type": "error",
                        "message": f"Failed to parse action: {e}",
                    }
                    # Continue to next iteration - LLM might recover
                    continue

                # Yield LLM reasoning
                yield {
                    "type": "llm_thought",
                    "thought": parsed_response.thought,
                    "action": parsed_response.action.model_dump(),
                }

                # Check if goal completed
                if parsed_response.goal_completed:
                    yield {
                        "type": "goal_completed",
                        "message": "Goal has been achieved!",
                        "thought": parsed_response.thought,
                    }
                    self._current_session.is_active = False
                    break

                # Execute action
                yield {
                    "type": "executing",
                    "action": parsed_response.action.model_dump(),
                }

                # Take screenshot before action if logging
                screenshot_before = capture if self.verify_after_action else None

                # Execute the action
                result = self.action_handler.execute(parsed_response.action)

                # Record action for rate limiting
                self.safety_manager.record_action()
                self._current_session.action_count += 1

                # Take screenshot after action
                screenshot_after = None
                if self.verify_after_action:
                    await asyncio.sleep(0.3)  # Brief pause for UI to update
                    screenshot_after = self.vision_engine.capture_screen()

                # Log the action
                self.action_logger.log_action(
                    result=result,
                    llm_reasoning=parsed_response.thought,
                    screenshot_before=screenshot_before,
                    screenshot_after=screenshot_after,
                )

                # Update action history
                self._action_history.append(
                    {
                        "action_type": result.action_type.value,
                        "success": result.success,
                        "error": result.error_message,
                    }
                )

                # Yield action result
                yield {
                    "type": "action_result",
                    "success": result.success,
                    "action_type": result.action_type.value,
                    "error": result.error_message,
                    "action_number": self._current_session.action_count,
                }

                if not result.success:
                    logger.warning(f"Action failed: {result.error_message}")

                # Brief pause between actions
                await asyncio.sleep(0.2)

            # Check why loop ended
            if self._current_session.action_count >= self.max_actions_per_session:
                yield {
                    "type": "max_actions_reached",
                    "count": self._current_session.action_count,
                }

        except Exception as e:
            logger.exception(f"Error in execution loop: {e}")
            self.action_logger.log_error("execution_error", str(e))
            yield {"type": "error", "message": str(e)}

        finally:
            # End session
            self.safety_manager.end_session()
            self.action_logger.end_session(
                success=not self._current_session.is_active,
                reason="completed"
                if not self._current_session.is_active
                else "stopped",
            )
            self._current_session = None

            yield {
                "type": "session_end",
                "total_actions": len(self._action_history),
            }

    async def _call_llm(self, messages: list[dict], system_prompt: str) -> str:
        """Call the LLM with messages.

        Args:
            messages: Messages to send to the LLM.
            system_prompt: System prompt for the LLM.

        Returns:
            LLM response as string.
        """
        if asyncio.iscoroutinefunction(self._llm_chat_func):
            response = await self._llm_chat_func(messages, system_prompt)
        else:
            response = self._llm_chat_func(messages, system_prompt)

        # Handle different response types
        if isinstance(response, str):
            return response
        elif hasattr(response, "__aiter__"):
            # Async iterator - collect all chunks
            chunks = []
            async for chunk in response:
                if isinstance(chunk, str):
                    chunks.append(chunk)
            return "".join(chunks)
        else:
            return str(response)

    def _parse_llm_response(self, response: str) -> LLMActionResponse:
        """Parse the LLM response into an action.

        Args:
            response: Raw LLM response string.

        Returns:
            Parsed LLMActionResponse.

        Raises:
            ValueError: If response cannot be parsed.
        """
        # Try to find JSON in the response
        response = response.strip()

        # Look for JSON block
        json_start = response.find("{")
        json_end = response.rfind("}") + 1

        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON found in response")

        json_str = response[json_start:json_end]

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")

        # Validate required fields
        if "action" not in data:
            raise ValueError("Missing 'action' field in response")

        # Parse the action
        action_data = data["action"]
        if isinstance(action_data, dict):
            action = self.action_handler._parse_action(action_data)
        else:
            raise ValueError(f"Invalid action format: {type(action_data)}")

        return LLMActionResponse(
            thought=data.get("thought", ""),
            action=action,
            goal_completed=data.get("goal_completed", False),
            confidence=data.get("confidence", 1.0),
        )

    def stop(self) -> None:
        """Request the execution loop to stop."""
        self._stop_requested = True
        if self._current_session:
            self._current_session.is_active = False
        logger.info("Stop requested for execution loop")

    def _on_kill_switch(self) -> None:
        """Callback when kill switch is triggered."""
        self.stop()
        self.action_logger.log_safety_event(
            "kill_switch",
            "Kill switch triggered - stopping all actions",
        )

    def is_running(self) -> bool:
        """Check if a session is currently running.

        Returns:
            True if a session is active.
        """
        return self._current_session is not None and self._current_session.is_active

    def get_session_state(self) -> SessionState | None:
        """Get the current session state.

        Returns:
            Current SessionState or None if no session.
        """
        return self._current_session

    def get_action_history(self) -> list[dict[str, Any]]:
        """Get the action history for the current session.

        Returns:
            List of action dictionaries.
        """
        return self._action_history.copy()

