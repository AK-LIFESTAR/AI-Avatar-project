"""Configuration models for the Computer Use module.

This module contains Pydantic models for validating computer use
configuration settings.
"""

from typing import Literal
from pydantic import BaseModel, Field


class ComputerUseConfig(BaseModel):
    """Configuration for the Computer Use feature.

    Attributes:
        enabled: Whether computer use is enabled.
        vision_llm_provider: LLM provider for vision analysis.
        max_actions_per_session: Maximum actions before auto-stop.
        action_rate_limit: Maximum actions per second.
        screenshot_scale: Scale factor for screenshots (0.1-1.0).
        kill_switch_corner: Screen corner that triggers kill switch.
        require_confirmation: Whether to require confirmation for actions.
        session_timeout: Seconds of inactivity before auto-stop.
        log_screenshots: Whether to save screenshots in logs.
        dry_run: If True, log actions without executing them.
    """

    enabled: bool = Field(
        default=False,
        description="Whether computer use is enabled (disabled by default for safety)",
    )

    vision_llm_provider: str = Field(
        default="openai_llm",
        description="LLM provider for vision analysis (must support vision)",
    )

    max_actions_per_session: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum number of actions per session",
    )

    action_rate_limit: float = Field(
        default=5.0,
        ge=0.1,
        le=20.0,
        description="Maximum actions per second",
    )

    screenshot_scale: float = Field(
        default=0.5,
        ge=0.1,
        le=1.0,
        description="Scale factor for screenshots sent to LLM",
    )

    screenshot_scale_factor: float = Field(
        default=0.5,
        ge=0.1,
        le=1.0,
        description="Alias for screenshot_scale for backward compatibility",
    )

    log_file: str = Field(
        default="computer_use_actions.jsonl",
        description="Path to the action log file",
    )

    kill_switch_corner: Literal[
        "top_left", "top_right", "bottom_left", "bottom_right"
    ] = Field(
        default="top_left",
        description="Screen corner that triggers emergency stop",
    )

    require_confirmation: bool = Field(
        default=False,
        description="Whether to require user confirmation before each action",
    )

    session_timeout: float = Field(
        default=300.0,
        ge=30.0,
        le=3600.0,
        description="Session timeout in seconds (5 minutes default)",
    )

    log_screenshots: bool = Field(
        default=False,
        description="Whether to save screenshots with action logs (uses disk space)",
    )

    dry_run: bool = Field(
        default=False,
        description="If True, log actions without actually executing them",
    )

    monitor_index: int = Field(
        default=1,
        ge=0,
        description="Monitor index to capture (0=all monitors, 1+=specific)",
    )

    class Config:
        """Pydantic configuration."""

        extra = "ignore"  # Ignore extra fields for forward compatibility

