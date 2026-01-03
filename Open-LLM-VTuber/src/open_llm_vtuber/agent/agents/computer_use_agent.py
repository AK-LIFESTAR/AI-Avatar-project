"""ComputerUseAgent for AI-controlled PC automation.

This module provides an agent that integrates with the computer use
framework to allow vision LLMs to control the user's computer.
"""

from typing import AsyncIterator, Dict, Any, Union, List
from loguru import logger

from .agent_interface import AgentInterface
from ..output_types import SentenceOutput, DisplayText
from ..input_types import BatchInput, TextSource
from ..stateless_llm.stateless_llm_interface import StatelessLLMInterface
from ...config_manager import TTSPreprocessorConfig
from ...computer_use import (
    ExecutionLoop,
    ActionHandler,
    VisionEngine,
    SafetyManager,
    ActionLogger,
    KillSwitchCorner,
)


class ComputerUseAgent(AgentInterface):
    """Agent for vision-based computer control.

    This agent uses a vision-capable LLM to analyze screenshots and
    execute mouse/keyboard actions to accomplish user goals.

    Attributes:
        execution_loop: The main execution loop for computer use.
        llm: The vision-capable LLM for analysis.
        enabled: Whether computer use is enabled.
    """

    def __init__(
        self,
        llm: StatelessLLMInterface,
        system: str = "",
        live2d_model=None,
        tts_preprocessor_config: TTSPreprocessorConfig | None = None,
        enabled: bool = True,
        max_actions_per_session: int = 50,
        action_rate_limit: float = 5.0,
        screenshot_scale: float = 0.5,
        kill_switch_corner: str = "top_left",
        session_timeout: float = 300.0,
        log_screenshots: bool = False,
        dry_run: bool = False,
    ):
        """Initialize the ComputerUseAgent.

        Args:
            llm: Vision-capable LLM for screen analysis.
            system: System prompt for the LLM.
            live2d_model: Live2D model for expressions (optional).
            tts_preprocessor_config: TTS configuration.
            enabled: Whether computer use is enabled.
            max_actions_per_session: Maximum actions per session.
            action_rate_limit: Actions per second limit.
            screenshot_scale: Scale factor for screenshots.
            kill_switch_corner: Corner for kill switch.
            session_timeout: Session timeout in seconds.
            log_screenshots: Whether to log screenshots.
            dry_run: If True, don't execute actions.
        """
        super().__init__()

        self._llm = llm
        self._system = system
        self._live2d_model = live2d_model
        self._tts_preprocessor_config = tts_preprocessor_config
        self.enabled = enabled
        self._memory: List[Dict[str, Any]] = []

        # Parse kill switch corner
        corner_map = {
            "top_left": KillSwitchCorner.TOP_LEFT,
            "top_right": KillSwitchCorner.TOP_RIGHT,
            "bottom_left": KillSwitchCorner.BOTTOM_LEFT,
            "bottom_right": KillSwitchCorner.BOTTOM_RIGHT,
        }
        kill_corner = corner_map.get(kill_switch_corner, KillSwitchCorner.TOP_LEFT)

        # Initialize components
        self._action_handler = ActionHandler(enabled=enabled, dry_run=dry_run)
        self._vision_engine = VisionEngine(scale_factor=screenshot_scale)
        self._safety_manager = SafetyManager(
            kill_switch_corner=kill_corner,
            rate_limit=action_rate_limit,
            session_timeout=session_timeout,
        )
        self._action_logger = ActionLogger(log_screenshots=log_screenshots)

        # Initialize execution loop
        self._execution_loop = ExecutionLoop(
            action_handler=self._action_handler,
            vision_engine=self._vision_engine,
            safety_manager=self._safety_manager,
            action_logger=self._action_logger,
            max_actions_per_session=max_actions_per_session,
        )

        # Set up LLM chat function
        self._execution_loop.set_llm_chat_function(self._llm_chat)

        logger.info(
            f"ComputerUseAgent initialized (enabled={enabled}, "
            f"max_actions={max_actions_per_session}, dry_run={dry_run})"
        )

    async def _llm_chat(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: str,
    ) -> str:
        """Chat with the LLM for screen analysis.

        Args:
            messages: Messages including screenshot.
            system_prompt: System prompt for computer use.

        Returns:
            LLM response as string.
        """
        # Collect the response from the streaming LLM
        response_chunks = []

        async for chunk in self._llm.chat_completion(messages, system_prompt):
            if isinstance(chunk, str):
                response_chunks.append(chunk)

        return "".join(response_chunks)

    async def chat(
        self,
        input_data: BatchInput,
    ) -> AsyncIterator[Union[SentenceOutput, Dict[str, Any]]]:
        """Process a chat input and execute computer use.

        Args:
            input_data: Input data containing user message.

        Yields:
            Status updates and responses.
        """
        # Extract user goal from input
        user_goal = self._extract_goal(input_data)

        if not user_goal:
            yield SentenceOutput(
                sentence="I didn't receive a clear goal. Please tell me what you'd like me to do on your computer.",
                actions=[],
                display_text=DisplayText(text="No goal provided"),
            )
            return

        if not self.enabled:
            yield SentenceOutput(
                sentence="Computer use is currently disabled. Please enable it in the settings to allow me to control your computer.",
                actions=[],
                display_text=DisplayText(text="Computer use disabled"),
            )
            return

        # Add to memory
        self._memory.append({"role": "user", "content": user_goal})

        # Yield initial status
        yield {
            "type": "computer_use_start",
            "goal": user_goal,
        }

        # Run the execution loop
        final_thought = ""
        action_count = 0

        async for update in self._execution_loop.run_session(user_goal):
            update_type = update.get("type")

            if update_type == "llm_thought":
                final_thought = update.get("thought", "")
                # Yield thought as partial response
                yield {
                    "type": "computer_use_thought",
                    "thought": final_thought,
                    "action": update.get("action"),
                }

            elif update_type == "action_result":
                action_count = update.get("action_number", action_count)
                yield {
                    "type": "computer_use_action",
                    "action_number": action_count,
                    "success": update.get("success"),
                    "action_type": update.get("action_type"),
                }

            elif update_type == "goal_completed":
                # Goal achieved - generate response
                completion_message = f"I've completed your request. {update.get('thought', '')}"
                self._memory.append({"role": "assistant", "content": completion_message})

                yield SentenceOutput(
                    sentence=completion_message,
                    actions=[],
                    display_text=DisplayText(text=f"Completed in {action_count} actions"),
                )
                return

            elif update_type == "error":
                error_msg = update.get("message", "Unknown error")
                yield {
                    "type": "computer_use_error",
                    "error": error_msg,
                }

            elif update_type == "safety_stop":
                reason = update.get("reason", "Safety mechanism triggered")
                yield SentenceOutput(
                    sentence=f"I had to stop for safety reasons: {reason}",
                    actions=[],
                    display_text=DisplayText(text=f"Stopped: {reason}"),
                )
                return

            elif update_type == "max_actions_reached":
                yield SentenceOutput(
                    sentence=f"I've reached the maximum number of actions ({action_count}). "
                    "The task might not be complete. Would you like me to continue?",
                    actions=[],
                    display_text=DisplayText(text=f"Max actions reached: {action_count}"),
                )
                return

            elif update_type == "session_end":
                # Session ended without explicit completion
                if final_thought:
                    yield SentenceOutput(
                        sentence=f"Session ended after {action_count} actions. {final_thought}",
                        actions=[],
                        display_text=DisplayText(text=f"Session ended: {action_count} actions"),
                    )
                return

    def _extract_goal(self, input_data: BatchInput) -> str:
        """Extract the user's goal from input data.

        Args:
            input_data: Input data containing user message.

        Returns:
            User's goal as string.
        """
        goals = []

        for text_data in input_data.texts:
            if text_data.source == TextSource.INPUT:
                goals.append(text_data.content)

        return " ".join(goals).strip()

    def set_system(self, system: str) -> None:
        """Set the system prompt.

        Args:
            system: New system prompt.
        """
        self._system = system

    def handle_interrupt(self, heard_response: str) -> None:
        """Handle user interruption.

        Args:
            heard_response: What the AI said before interruption.
        """
        # Stop the execution loop
        self._execution_loop.stop()
        self._action_logger.log_safety_event(
            "user_interrupt",
            f"User interrupted. Last response: {heard_response[:100]}...",
        )
        logger.info("Computer use interrupted by user")

    def set_memory_from_history(self, conf_uid: str, history_uid: str) -> None:
        """Load memory from chat history.

        Args:
            conf_uid: Configuration UID.
            history_uid: History UID.
        """
        # Computer use agent doesn't maintain persistent memory
        self._memory.clear()
        logger.debug("ComputerUseAgent memory cleared (no persistent history)")

    def start_group_conversation(
        self, human_name: str, ai_participants: List[str]
    ) -> None:
        """Start a group conversation (not supported).

        Args:
            human_name: Human participant name.
            ai_participants: AI participant names.
        """
        logger.warning("Group conversation not supported for ComputerUseAgent")

    def stop_computer_use(self) -> None:
        """Stop any active computer use session."""
        self._execution_loop.stop()
        logger.info("Computer use stopped")

    def is_running(self) -> bool:
        """Check if computer use is currently running.

        Returns:
            True if a session is active.
        """
        return self._execution_loop.is_running()

