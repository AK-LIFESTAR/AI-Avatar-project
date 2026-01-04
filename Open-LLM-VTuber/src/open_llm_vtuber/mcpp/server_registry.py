"""MCP Server Manager for Open-LLM-Vtuber."""

import shutil
import json
import sys

from pathlib import Path
from typing import Dict, Optional, Union, Any
from loguru import logger

from .types import MCPServer
from .utils.path import validate_file


def get_base_dir() -> Path:
    """Get the base directory for the application.
    
    In packaged builds (PyInstaller), returns the directory containing the executable.
    In development mode, returns the project root directory.
    """
    if getattr(sys, 'frozen', False):
        # Running as compiled executable (PyInstaller)
        return Path(sys.executable).parent
    else:
        # Running in development mode - go up from src/open_llm_vtuber/mcpp/
        return Path(__file__).parent.parent.parent.parent


# Use absolute path for mcp_servers.json
DEFAULT_CONFIG_PATH = get_base_dir() / "mcp_servers.json"


class ServerRegistry:
    """MCP Server Manager for managing server files."""

    def __init__(self, config_path: str | Path | None = None) -> None:
        """Initialize the MCP Server Manager.
        
        Args:
            config_path: Path to the mcp_servers.json file. If None, uses default.
        """
        if config_path is None:
            config_path = DEFAULT_CONFIG_PATH
        
        # If mcp_servers.json doesn't exist, gracefully handle it
        config_path = Path(config_path)
        if not config_path.exists():
            logger.warning(
                f"MCPSR: MCP servers config file not found at '{config_path}'. "
                "MCP tools will not be available."
            )
            self.config = {"mcp_servers": {}}
            self.servers: Dict[str, MCPServer] = {}
            self.npx_available = False
            self.uvx_available = False
            self.node_available = False
            return
        
        try:
            config_path = validate_file(config_path, ".json")
        except ValueError:
            logger.warning(
                f"MCPSR: File '{config_path}' is not a valid JSON file. "
                "MCP tools will not be available."
            )
            self.config = {"mcp_servers": {}}
            self.servers = {}
            self.npx_available = False
            self.uvx_available = False
            self.node_available = False
            return

        self.config: Dict[str, Union[str, dict]] = json.loads(
            config_path.read_text(encoding="utf-8")
        )

        self.servers: Dict[str, MCPServer] = {}

        self.npx_available = self._detect_runtime("npx")
        self.uvx_available = self._detect_runtime("uvx")
        self.node_available = self._detect_runtime("node")

        self.load_servers()

    def _detect_runtime(self, target: str) -> bool:
        """Check if a runtime is available in the system PATH."""
        founded = shutil.which(target)
        return True if founded else False

    def load_servers(self) -> None:
        """Load servers from the config file."""
        servers_config: Dict[str, Dict[str, Any]] = self.config.get("mcp_servers", {})
        if servers_config == {}:
            logger.warning("MCPSR: No servers found in the config file.")
            return

        for server_name, server_details in servers_config.items():
            if "command" not in server_details or "args" not in server_details:
                logger.warning(
                    f"MCPSR: Invalid server details for '{server_name}'. Ignoring."
                )
                continue

            command = server_details["command"]
            if command == "npx":
                if not self.npx_available:
                    logger.warning(
                        f"MCPSR: npx is not available. Cannot load server '{server_name}'."
                    )
                    continue
            elif command == "uvx":
                if not self.uvx_available:
                    logger.warning(
                        f"MCPSR: uvx is not available. Cannot load server '{server_name}'."
                    )
                    continue

            elif command == "node":
                if not self.node_available:
                    logger.warning(
                        f"MCPSR: node is not available. Cannot load server '{server_name}'."
                    )
                    continue

            self.servers[server_name] = MCPServer(
                name=server_name,
                command=command,
                args=server_details["args"],
                env=server_details.get("env", None),
                cwd=server_details.get("cwd", None),
                timeout=server_details.get("timeout", None),
            )
            logger.debug(f"MCPSR: Loaded server: '{server_name}'.")

    def remove_server(self, server_name: str) -> None:
        """Remove a server from the available servers."""
        try:
            self.servers.pop(server_name)
            logger.info(f"MCPSR: Removed server: {server_name}")
        except KeyError:
            logger.warning(f"MCPSR: Server '{server_name}' not found. Cannot remove.")

    def get_server(self, server_name: str) -> Optional[MCPServer]:
        """Get the server by name."""
        return self.servers.get(server_name, None)
