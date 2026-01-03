"""
Window Manager - Detects open windows and applications on macOS and Windows.

This module provides cross-platform window detection to help the AI
understand the desktop layout when multiple windows are open.
"""

import platform
import subprocess
from typing import Optional
from dataclasses import dataclass
from loguru import logger


@dataclass
class WindowInfo:
    """Information about an open window."""

    name: str
    app_name: str
    x: int
    y: int
    width: int
    height: int
    is_active: bool = False
    is_minimized: bool = False


class WindowManager:
    """Cross-platform window detection and management."""

    def __init__(self):
        self.os_type = platform.system()
        logger.info(f"WindowManager initialized for {self.os_type}")

    def get_open_windows(self) -> list[WindowInfo]:
        """Get list of all open windows with their positions."""
        if self.os_type == "Darwin":
            return self._get_macos_windows()
        elif self.os_type == "Windows":
            return self._get_windows_windows()
        else:
            return []

    def get_active_window(self) -> Optional[WindowInfo]:
        """Get the currently active/focused window."""
        windows = self.get_open_windows()
        for window in windows:
            if window.is_active:
                return window
        return windows[0] if windows else None

    def get_running_apps(self) -> list[str]:
        """Get list of running application names."""
        if self.os_type == "Darwin":
            return self._get_macos_apps()
        elif self.os_type == "Windows":
            return self._get_windows_apps()
        return []

    def _get_macos_windows(self) -> list[WindowInfo]:
        """Get open windows on macOS using AppleScript."""
        windows = []
        try:
            # Simplified, faster AppleScript - just get app names and active app
            script = """
            tell application "System Events"
                set activeApp to name of first application process whose frontmost is true
                set appList to ""
                repeat with proc in (every process whose visible is true)
                    set procName to name of proc
                    set isActive to (procName = activeApp)
                    set appList to appList & procName & "|" & isActive & "\\n"
                end repeat
                return appList
            end tell
            """
            result = subprocess.run(
                ["osascript", "-e", script], capture_output=True, text=True, timeout=3
            )

            if result.returncode == 0 and result.stdout.strip():
                for line in result.stdout.strip().split("\n"):
                    parts = line.split("|")
                    if len(parts) >= 2:
                        try:
                            windows.append(
                                WindowInfo(
                                    app_name=parts[0].strip(),
                                    name=parts[0].strip(),
                                    x=0,
                                    y=0,
                                    width=0,
                                    height=0,  # Position not tracked for speed
                                    is_active=parts[1].strip().lower() == "true",
                                )
                            )
                        except (ValueError, IndexError):
                            continue
        except subprocess.TimeoutExpired:
            logger.warning("Timeout getting macOS windows")
        except Exception as e:
            logger.error(f"Error getting macOS windows: {e}")

        return windows

    def _get_macos_apps(self) -> list[str]:
        """Get running apps on macOS."""
        # Reuse window data to avoid duplicate AppleScript calls
        windows = self._get_macos_windows()
        return list(set(w.app_name for w in windows))

    def _get_windows_windows(self) -> list[WindowInfo]:
        """Get open windows on Windows using pygetwindow."""
        windows = []
        try:
            import pygetwindow as gw

            active_window = gw.getActiveWindow()
            active_title = active_window.title if active_window else ""

            for win in gw.getAllWindows():
                if win.title and win.visible and win.width > 0 and win.height > 0:
                    windows.append(
                        WindowInfo(
                            name=win.title,
                            app_name=win.title.split(" - ")[-1]
                            if " - " in win.title
                            else win.title,
                            x=win.left,
                            y=win.top,
                            width=win.width,
                            height=win.height,
                            is_active=(win.title == active_title),
                            is_minimized=win.isMinimized,
                        )
                    )
        except ImportError:
            logger.warning("pygetwindow not available, trying alternative method")
            # Fallback: use PowerShell
            try:
                ps_script = """
                Add-Type @"
                    using System;
                    using System.Runtime.InteropServices;
                    public class Win32 {
                        [DllImport("user32.dll")]
                        public static extern IntPtr GetForegroundWindow();
                    }
"@
                Get-Process | Where-Object {$_.MainWindowTitle} | ForEach-Object {
                    $title = $_.MainWindowTitle
                    $name = $_.ProcessName
                    Write-Output "$name|$title"
                }
                """
                result = subprocess.run(
                    ["powershell", "-Command", ps_script],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    for line in result.stdout.strip().split("\n"):
                        parts = line.split("|")
                        if len(parts) >= 2:
                            windows.append(
                                WindowInfo(
                                    name=parts[1],
                                    app_name=parts[0],
                                    x=0,
                                    y=0,
                                    width=0,
                                    height=0,  # Position unknown
                                )
                            )
            except Exception as e:
                logger.error(f"Error with PowerShell fallback: {e}")
        except Exception as e:
            logger.error(f"Error getting Windows windows: {e}")

        return windows

    def _get_windows_apps(self) -> list[str]:
        """Get running apps on Windows."""
        apps = []
        try:
            import pygetwindow as gw

            for win in gw.getAllWindows():
                if win.title and win.visible:
                    app_name = (
                        win.title.split(" - ")[-1] if " - " in win.title else win.title
                    )
                    if app_name not in apps:
                        apps.append(app_name)
        except ImportError:
            try:
                result = subprocess.run(
                    [
                        "powershell",
                        "-Command",
                        "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -ExpandProperty ProcessName -Unique",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    apps = [
                        a.strip()
                        for a in result.stdout.strip().split("\n")
                        if a.strip()
                    ]
            except Exception as e:
                logger.error(f"Error getting Windows apps: {e}")
        except Exception as e:
            logger.error(f"Error getting Windows apps: {e}")

        return apps

    def get_desktop_layout_description(self) -> str:
        """Generate a human-readable description of the desktop layout."""
        windows = self.get_open_windows()
        apps = self.get_running_apps()

        if not windows and not apps:
            return "Unable to detect open windows."

        lines = []

        # Running apps
        if apps:
            lines.append(f"Running applications: {', '.join(apps[:10])}")
            if len(apps) > 10:
                lines.append(f"  ... and {len(apps) - 10} more")

        # Window layout
        if windows:
            lines.append(f"\nOpen windows ({len(windows)}):")

            # Sort by position (left to right, top to bottom)
            sorted_windows = sorted(windows, key=lambda w: (w.y, w.x))

            for i, win in enumerate(sorted_windows[:8], 1):
                active_marker = " [ACTIVE]" if win.is_active else ""
                position = f"at ({win.x}, {win.y})" if win.x > 0 or win.y > 0 else ""
                size = f"size {win.width}x{win.height}" if win.width > 0 else ""

                line = f"  {i}. {win.app_name}"
                if win.name and win.name != win.app_name:
                    line += (
                        f' - "{win.name[:40]}..."'
                        if len(win.name) > 40
                        else f' - "{win.name}"'
                    )
                if position:
                    line += f" {position}"
                if size:
                    line += f" ({size})"
                line += active_marker

                lines.append(line)

            if len(windows) > 8:
                lines.append(f"  ... and {len(windows) - 8} more windows")

        return "\n".join(lines)

    def find_app_window(self, app_name: str) -> Optional[WindowInfo]:
        """Find a window by application name (partial match)."""
        app_lower = app_name.lower()
        windows = self.get_open_windows()

        for win in windows:
            if app_lower in win.app_name.lower() or app_lower in win.name.lower():
                return win

        return None

    def is_app_running(self, app_name: str) -> bool:
        """Check if an application is running."""
        app_lower = app_name.lower()
        apps = self.get_running_apps()

        for app in apps:
            if app_lower in app.lower():
                return True

        return False
