"""
Computer Use Session - Advanced autonomous computer control agent.

This module implements a sophisticated AI agent that can control any computer
(macOS or Windows) to accomplish arbitrary tasks like a human user.
"""

import asyncio
import json
import platform
import re
from typing import Callable, Optional, Any
from loguru import logger

from .action_handler import ActionHandler
from .vision_engine import VisionEngine
from .safety import SafetyManager
from .logger import ActionLogger
from .types import KillSwitchCorner
from .window_manager import WindowManager
from ..config_manager.computer_use import ComputerUseConfig


class ComputerUseSession:
    """
    Advanced autonomous computer control session.

    This agent can:
    - See the screen through screenshots
    - Understand UI elements and their purpose
    - Control mouse and keyboard
    - Accomplish ANY task the user requests
    - Work on both macOS and Windows
    """

    def __init__(
        self,
        config: ComputerUseConfig,
        llm: Optional[Any] = None,
        websocket_send: Optional[Callable] = None,
    ):
        """Initialize the computer use session."""
        self.config = config
        self.llm = llm
        self.websocket_send = websocket_send

        # Detect operating system
        self.os_type = self._detect_os()
        logger.info(f"Detected operating system: {self.os_type}")

        # Initialize components
        self.action_handler = ActionHandler(dry_run=config.dry_run)
        self.vision_engine = VisionEngine(scale_factor=config.screenshot_scale)

        # Parse kill switch corner
        corner_map = {
            "top_left": KillSwitchCorner.TOP_LEFT,
            "top_right": KillSwitchCorner.TOP_RIGHT,
            "bottom_left": KillSwitchCorner.BOTTOM_LEFT,
            "bottom_right": KillSwitchCorner.BOTTOM_RIGHT,
        }
        kill_corner = corner_map.get(
            config.kill_switch_corner, KillSwitchCorner.TOP_LEFT
        )

        self.safety_manager = SafetyManager(
            kill_switch_corner=kill_corner,
            rate_limit=config.action_rate_limit,
            session_timeout=config.session_timeout,
            on_kill_switch=self._on_kill_switch,
        )
        self._max_actions = config.max_actions_per_session
        self.action_logger = ActionLogger(log_screenshots=config.log_screenshots)

        # Initialize window manager for desktop layout detection
        self.window_manager = WindowManager()

        # Session state
        self._running = False
        self._action_count = 0
        self._action_history: list[dict] = []
        self._consecutive_same_action = 0
        self._last_action_key = ""
        self._last_error: Optional[str] = None

        logger.info("ComputerUseSession initialized (Advanced Autonomous Agent)")

    def _detect_os(self) -> str:
        """Detect the operating system."""
        system = platform.system()
        if system == "Darwin":
            return "macOS"
        elif system == "Windows":
            return "Windows"
        elif system == "Linux":
            return "Linux"
        return "Unknown"

    def _on_kill_switch(self) -> None:
        """Callback when kill switch is triggered."""
        logger.warning("🛑 Kill switch triggered - stopping session!")
        self._running = False

    async def _send_ws(self, data: dict) -> None:
        """Send WebSocket message."""
        if not self.websocket_send:
            return
        try:
            msg = json.dumps(data)
            result = self.websocket_send(msg)
            if asyncio.iscoroutine(result):
                await result
        except Exception as e:
            logger.error(f"WebSocket send error: {e}")

    def _get_action_key(self, action_dict: dict) -> str:
        """Generate a key to identify similar actions."""
        action = action_dict.get("action", "")
        if action in ["move", "click"]:
            coords = action_dict.get("coords", [])
            if coords:
                return f"{action}_{coords[0] // 50}_{coords[1] // 50}"
        elif action == "type":
            return f"type_{action_dict.get('text', '')[:20]}"
        elif action == "hotkey":
            keys = action_dict.get("keys", [])
            return f"hotkey_{'_'.join(keys)}"
        return f"{action}"

    def _check_repeat_action(self, action_dict: dict) -> bool:
        """Check if action is being repeated excessively."""
        action_key = self._get_action_key(action_dict)

        if action_key == self._last_action_key:
            self._consecutive_same_action += 1
            if self._consecutive_same_action >= 3:
                logger.info("Stopping - same action repeated 3 times")
                return True
        else:
            self._consecutive_same_action = 1
            self._last_action_key = action_key

        return False

    async def run(self, goal: str) -> None:
        """
        Run the autonomous computer control session.

        The agent will continuously:
        1. Capture the screen
        2. Analyze what it sees
        3. Decide and execute the next action
        4. Verify success
        5. Repeat until goal is complete or max actions reached
        """
        self._running = True
        self._action_count = 0
        self._action_history = []
        self._consecutive_same_action = 0
        self._last_action_key = ""
        self._last_error = None

        # Start safety monitoring and logging
        self.safety_manager.start_session()
        import uuid

        session_id = str(uuid.uuid4())[:8]
        self.action_logger.start_session(session_id, goal)

        logger.info(f"🚀 Starting autonomous session for: {goal}")
        logger.info(f"   OS: {self.os_type} | Max actions: {self._max_actions}")

        await self._send_ws(
            {
                "type": "computer_use_status",
                "status": "started",
                "goal": goal,
                "os_type": self.os_type,
                "message": f"Starting autonomous control on {self.os_type}",
            }
        )

        try:
            while self._running:
                # Safety checks
                if self.safety_manager.is_kill_switch_triggered():
                    logger.warning("🛑 Kill switch activated!")
                    await self._send_ws(
                        {
                            "type": "computer_use_status",
                            "status": "kill_switch",
                            "message": "Session stopped by safety kill switch",
                        }
                    )
                    break

                if self._action_count >= self._max_actions:
                    logger.info(f"📊 Max actions ({self._max_actions}) reached")
                    await self._send_ws(
                        {
                            "type": "computer_use_status",
                            "status": "max_actions",
                            "message": f"Reached maximum actions ({self._max_actions})",
                        }
                    )
                    break

                # 1. Capture screen
                try:
                    screen_capture = self.vision_engine.capture_screen()
                    screenshot_b64 = screen_capture.image_base64
                    screen_size = (
                        screen_capture.original_width,
                        screen_capture.original_height,
                    )
                except Exception as e:
                    logger.error(f"Screen capture failed: {e}")
                    await asyncio.sleep(1)
                    continue

                # 2. Send "thinking" status
                await self._send_ws(
                    {
                        "type": "computer_use_status",
                        "status": "thinking",
                        "thought": "🔍 Analyzing screen and planning next action...",
                        "action_count": self._action_count,
                    }
                )

                # 3. Get action from AI
                ai_response = await self._get_ai_action(
                    goal, screenshot_b64, screen_size
                )

                # 4. Check if task is done
                if ai_response.get("action", {}).get("action") in ["done", "none"]:
                    summary = ai_response.get("action", {}).get(
                        "summary", "Task completed"
                    )
                    reason = ai_response.get("action", {}).get("reason", summary)
                    logger.info(f"✅ Task completed: {reason}")
                    await self._send_ws(
                        {
                            "type": "computer_use_status",
                            "status": "completed",
                            "message": reason,
                            "thought": ai_response.get("thinking", "Goal achieved"),
                        }
                    )
                    break

                # 5. Extract and validate action
                action_dict = ai_response.get("action", {})
                action_type = action_dict.get("action")

                valid_actions = [
                    "click",
                    "type",
                    "scroll",
                    "move",
                    "hotkey",
                    "drag",
                    "wait",
                ]
                if not action_type or action_type not in valid_actions:
                    logger.warning(
                        f"Invalid action: {action_type}, using OS-specific fallback"
                    )
                    action_dict = self._get_fallback_action(goal)
                    action_type = action_dict.get("action")

                # 6. Check for repeated actions
                if self._check_repeat_action(action_dict):
                    await self._send_ws(
                        {
                            "type": "computer_use_status",
                            "status": "completed",
                            "message": "Task appears complete (action stabilized)",
                        }
                    )
                    break

                # 7. Rate limit check
                can_execute, reason = self.safety_manager.can_execute_action()
                if not can_execute:
                    logger.warning(f"Rate limited: {reason}")
                    await asyncio.sleep(0.5)
                    continue

                # 8. Execute action
                self._action_count += 1

                # Build detailed thought message
                thought = self._build_action_thought(action_dict, ai_response)

                await self._send_ws(
                    {
                        "type": "computer_use_status",
                        "status": "thought",
                        "thought": thought,
                        "observation": ai_response.get("observation", ""),
                        "thinking": ai_response.get("thinking", ""),
                        "next_step": ai_response.get("next_step", ""),
                        "action_type": action_type,
                        "action_count": self._action_count,
                    }
                )

                # Execute the action
                try:
                    result = self.action_handler.execute(action_dict)
                    success = result.success
                    error_msg = result.error_message
                    self._last_error = error_msg if not success else None
                except Exception as e:
                    logger.error(f"Action execution error: {e}")
                    success = False
                    error_msg = str(e)
                    self._last_error = error_msg

                # Record action
                action_summary = self._summarize_action(action_dict)
                self._action_history.append(
                    {
                        "action": action_type,
                        "success": success,
                        "summary": action_summary,
                        "error": error_msg,
                    }
                )

                self.safety_manager.record_action()
                if result and hasattr(result, "action_type"):
                    self.action_logger.log_action(result)

                # Send action status
                await self._send_ws(
                    {
                        "type": "computer_use_status",
                        "status": "action",
                        "action_type": action_type,
                        "action_number": self._action_count,
                        "max_actions": self._max_actions,
                        "success": success,
                        "error": error_msg if not success else None,
                        "summary": action_summary,
                    }
                )

                # Wait between actions
                await asyncio.sleep(1.0 / self.config.action_rate_limit)

        except asyncio.CancelledError:
            logger.info("Session cancelled")
            await self._send_ws(
                {
                    "type": "computer_use_status",
                    "status": "cancelled",
                    "message": "Session cancelled",
                }
            )
        except Exception as e:
            logger.error(f"Session error: {e}", exc_info=True)
            await self._send_ws(
                {"type": "computer_use_status", "status": "error", "error": str(e)}
            )
        finally:
            self._running = False
            self.safety_manager.end_session()
            logger.info(f"Session ended. Total actions: {self._action_count}")
            await self._send_ws(
                {
                    "type": "computer_use_status",
                    "status": "ended",
                    "message": "Session ended",
                    "total_actions": self._action_count,
                }
            )

    def _get_fallback_action(self, goal: str) -> dict:
        """Get OS-specific fallback action for common tasks."""
        goal_lower = goal.lower()

        # Opening apps
        if any(word in goal_lower for word in ["open", "launch", "start", "run"]):
            if self.os_type == "macOS":
                return {"action": "hotkey", "keys": ["command", "space"]}
            else:  # Windows
                return {"action": "hotkey", "keys": ["win"]}

        # Browser operations
        if "browser" in goal_lower or "web" in goal_lower:
            if self.os_type == "macOS":
                return {"action": "hotkey", "keys": ["command", "space"]}
            else:
                return {"action": "hotkey", "keys": ["win"]}

        # File operations
        if "file" in goal_lower or "folder" in goal_lower:
            if self.os_type == "macOS":
                return {"action": "hotkey", "keys": ["command", "shift", "g"]}
            else:
                return {"action": "hotkey", "keys": ["win", "e"]}

        # Default: wait and retry
        return {"action": "wait", "seconds": 1}

    def _build_action_thought(self, action_dict: dict, ai_response: dict) -> str:
        """Build a human-readable thought message about the action."""
        action_type = action_dict.get("action", "unknown")

        # Use AI's thinking if available
        ai_thinking = ai_response.get("thinking", "")

        # Build action description with emojis
        if action_type == "click":
            coords = action_dict.get("coords", [0, 0])
            button = action_dict.get("button", "left")
            clicks = action_dict.get("clicks", 1)
            click_type = "Double-clicking" if clicks == 2 else "Clicking"
            desc = f"🖱️ {click_type} at ({coords[0]}, {coords[1]})"
            if button != "left":
                desc += f" [{button} button]"
        elif action_type == "type":
            text = action_dict.get("text", "")
            display_text = text[:30] + "..." if len(text) > 30 else text
            desc = f"⌨️ Typing: '{display_text}'"
        elif action_type == "hotkey":
            keys = action_dict.get("keys", [])
            desc = f"⌨️ Pressing: {' + '.join(keys)}"
        elif action_type == "scroll":
            direction = action_dict.get("direction", "down")
            desc = f"📜 Scrolling {direction}"
        elif action_type == "move":
            coords = action_dict.get("coords", [0, 0])
            desc = f"🖱️ Moving to ({coords[0]}, {coords[1]})"
        elif action_type == "drag":
            start = action_dict.get("start", [0, 0])
            end = action_dict.get("end", [0, 0])
            desc = f"🖱️ Dragging from {start} to {end}"
        elif action_type == "wait":
            seconds = action_dict.get("seconds", 1)
            desc = f"⏳ Waiting {seconds}s"
        else:
            desc = f"Action: {action_type}"

        # Combine with AI thinking
        if ai_thinking:
            return f"{desc}\n💭 {ai_thinking}"
        return desc

    def _summarize_action(self, action_dict: dict) -> str:
        """Create a brief summary of an action."""
        action = action_dict.get("action", "unknown")
        if action == "click":
            coords = action_dict.get("coords", [0, 0])
            return f"Click at ({coords[0]}, {coords[1]})"
        elif action == "type":
            text = action_dict.get("text", "")
            return f"Type '{text[:20]}...'" if len(text) > 20 else f"Type '{text}'"
        elif action == "hotkey":
            keys = action_dict.get("keys", [])
            return f"Press {'+'.join(keys)}"
        elif action == "scroll":
            return f"Scroll {action_dict.get('direction', 'down')}"
        elif action == "move":
            coords = action_dict.get("coords", [0, 0])
            return f"Move to ({coords[0]}, {coords[1]})"
        elif action == "wait":
            return f"Wait {action_dict.get('seconds', 1)}s"
        return action

    async def _get_ai_action(
        self, goal: str, screenshot_b64: str, screen_size: tuple
    ) -> dict:
        """Get the next action from the AI vision model."""
        from .prompts import (
            COMPUTER_USE_SYSTEM_PROMPT,
            build_user_message,
            get_os_specific_hint,
        )

        # Get desktop layout information (open windows, running apps)
        desktop_layout = ""
        try:
            desktop_layout = self.window_manager.get_desktop_layout_description()
            if desktop_layout:
                desktop_layout = f"\n\n## 🖥️ DESKTOP LAYOUT\n{desktop_layout}"
        except Exception as e:
            logger.warning(f"Could not get desktop layout: {e}")

        # Check if target app is already running
        target_app_info = ""
        goal_lower = goal.lower()
        common_apps = [
            "teams",
            "chrome",
            "safari",
            "firefox",
            "spotify",
            "slack",
            "discord",
            "finder",
            "explorer",
            "terminal",
            "code",
            "vscode",
            "word",
            "excel",
            "notes",
        ]
        for app in common_apps:
            if app in goal_lower:
                if self.window_manager.is_app_running(app):
                    window = self.window_manager.find_app_window(app)
                    if window:
                        target_app_info = (
                            f"\n\n💡 NOTE: {app.title()} is ALREADY RUNNING"
                        )
                        if window.x > 0 or window.y > 0:
                            target_app_info += f" at position ({window.x}, {window.y})"
                        if not window.is_active:
                            target_app_info += ". Click on it to bring it to focus."
                        else:
                            target_app_info += " and is currently ACTIVE."
                else:
                    target_app_info = f"\n\n💡 NOTE: {app.title()} is NOT currently running. You need to open it."
                break

        # Build context-aware prompt
        user_message = build_user_message(
            goal=goal,
            action_history=self._action_history,
            error=self._last_error,
            screen_width=screen_size[0],
            screen_height=screen_size[1],
            os_type=self.os_type,
        )

        # Add desktop layout and app info
        user_message += desktop_layout
        user_message += target_app_info

        # Add OS-specific hints
        os_hints = get_os_specific_hint(goal, self.os_type)
        if os_hints:
            user_message += os_hints

        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_message},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{screenshot_b64}"
                            },
                        },
                    ],
                }
            ]

            # Call the LLM
            response = ""
            async for chunk in self.llm.chat_completion(
                messages=messages, system=COMPUTER_USE_SYSTEM_PROMPT
            ):
                if isinstance(chunk, str):
                    response += chunk

            logger.debug(f"AI Response: {response[:500]}...")

            # Parse the response
            return self._parse_ai_response(response, goal, screen_size)

        except Exception as e:
            logger.error(f"AI call failed: {e}")
            return {
                "observation": "Error getting AI response",
                "thinking": str(e),
                "action": self._get_fallback_action(goal),
                "next_step": "Retry with fallback action",
            }

    def _parse_ai_response(self, response: str, goal: str, screen_size: tuple) -> dict:
        """Parse the AI's response into structured format."""
        result = {"observation": "", "thinking": "", "action": {}, "next_step": ""}

        # Try to parse as JSON first
        try:
            # Find JSON in response
            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                parsed = json.loads(json_match.group())

                # Handle nested action format
                if "action" in parsed:
                    if isinstance(parsed["action"], dict):
                        result["action"] = parsed["action"]
                    else:
                        result["action"] = {"action": parsed["action"]}

                # Extract other fields
                result["observation"] = parsed.get("observation", "")
                result["thinking"] = parsed.get("thinking", parsed.get("thought", ""))
                result["next_step"] = parsed.get("next_step", "")

                # Handle goal_completed flag
                if parsed.get("goal_completed", False):
                    result["action"] = {"action": "done", "summary": result["thinking"]}

                return result
        except json.JSONDecodeError:
            pass

        # Fallback: Extract action from text
        response_lower = response.lower()

        # Check for completion
        completion_indicators = [
            "done",
            "complete",
            "finished",
            "accomplished",
            "goal achieved",
        ]
        if (
            any(ind in response_lower for ind in completion_indicators)
            and "not" not in response_lower
        ):
            return {
                "observation": response[:200],
                "thinking": "Task appears complete",
                "action": {"action": "done", "summary": "Task completed"},
                "next_step": "None - task finished",
            }

        # Extract action type and parameters
        action = self._extract_action_from_text(response, goal, screen_size)

        return {
            "observation": response[:200],
            "thinking": "Extracted from response",
            "action": action,
            "next_step": "Continue toward goal",
        }

    def _extract_action_from_text(
        self, response: str, goal: str, screen_size: tuple
    ) -> dict:
        """Extract action from free-text response."""
        response_lower = response.lower()

        # Look for coordinates
        coord_match = re.search(r"(\d{2,4})\s*[,x]\s*(\d{2,4})", response)
        coords = (
            [int(coord_match.group(1)), int(coord_match.group(2))]
            if coord_match
            else None
        )

        # Detect action type
        if "click" in response_lower:
            if coords:
                return {
                    "action": "click",
                    "coords": coords,
                    "button": "left",
                    "clicks": 1,
                }
            # Click center as fallback
            return {
                "action": "click",
                "coords": [screen_size[0] // 2, screen_size[1] // 2],
            }

        if "type" in response_lower or "enter" in response_lower:
            # Extract text to type
            text_match = re.search(r'["\']([^"\']+)["\']', response)
            if text_match:
                return {"action": "type", "text": text_match.group(1)}

        if "hotkey" in response_lower or "press" in response_lower:
            # Extract key names
            key_patterns = [
                r"(command|cmd|ctrl|control|alt|option|shift|win|enter|return|tab|escape|space)",
                r"\+\s*(command|cmd|ctrl|control|alt|option|shift|win|enter|return|tab|escape|space|\w)",
            ]
            keys = []
            for pattern in key_patterns:
                matches = re.findall(pattern, response_lower)
                keys.extend(matches)
            if keys:
                # Normalize key names
                key_map = {"cmd": "command", "control": "ctrl", "return": "enter"}
                keys = [key_map.get(k, k) for k in keys[:4]]  # Max 4 keys
                return {"action": "hotkey", "keys": keys}

        if "scroll" in response_lower:
            direction = "up" if "up" in response_lower else "down"
            return {"action": "scroll", "direction": direction, "amount": 3}

        if "move" in response_lower and coords:
            return {"action": "move", "coords": coords}

        if "wait" in response_lower:
            return {"action": "wait", "seconds": 2}

        # Fallback based on goal
        return self._get_fallback_action(goal)

    def stop(self) -> None:
        """Stop the running session."""
        logger.info("Stop requested for computer use session")
        self._running = False
        self.safety_manager.end_session()
