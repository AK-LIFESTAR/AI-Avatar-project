# -*- mode: python ; coding: utf-8 -*-
#
# Build a standalone backend executable for Windows that can be bundled into the
# Electron installer (Open-LLM-VTuber-Web).
#
# Output (onedir):
#   dist/open-llm-vtuber-backend/open-llm-vtuber-backend.exe
#
# Then copy the whole dist folder contents into:
#   Open-LLM-VTuber-Web/backend-dist/
#

from pathlib import Path
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules

# NOTE:
# PyInstaller executes spec files via exec() and does not guarantee `__file__` is defined
# across versions/environments. Use an explicit env var override, otherwise assume the
# current working directory is the backend repo root (our CI runs PyInstaller from there).
project_root = Path(os.environ.get("OPEN_LLM_VTUBER_BACKEND_ROOT", Path.cwd())).resolve()

block_cipher = None


def rel(p: str) -> str:
    return str((project_root / p).resolve())

INCLUDE_OFFLINE_MODELS = os.environ.get("OPEN_LLM_VTUBER_INCLUDE_OFFLINE_MODELS", "0") == "1"

# =============================================================================
# Collect mypyc-compiled packages
# These packages use mypyc for performance and have dynamically named modules
# that PyInstaller can't automatically detect (e.g., '3c22db458360489351e4__mypyc')
# =============================================================================
mypyc_packages = ['tomli', 'black', 'mypy', 'mypyc']

extra_datas = []
extra_binaries = []
extra_hiddenimports = []

for pkg in mypyc_packages:
    try:
        pkg_datas, pkg_binaries, pkg_hiddenimports = collect_all(pkg)
        extra_datas.extend(pkg_datas)
        extra_binaries.extend(pkg_binaries)
        extra_hiddenimports.extend(pkg_hiddenimports)
    except Exception:
        # Package might not be installed, skip it
        pass

# Also collect all submodules from key packages that may have complex imports
for pkg in ['uvicorn', 'starlette', 'fastapi', 'pydantic', 'pydantic_core', 'anthropic', 'openai', 'httpx', 'httpcore']:
    try:
        extra_hiddenimports.extend(collect_submodules(pkg))
    except Exception:
        pass

datas = [
    (rel("conf.yaml"), "."),
    (rel("model_dict.json"), "."),
    (rel("mcp_servers.json"), "."),
    (rel("pyproject.toml"), "."),
    (rel("characters"), "characters"),
    (rel("live2d-models"), "live2d-models"),
    (rel("prompts"), "prompts"),
    (rel("config_templates"), "config_templates"),
    (rel("upgrade_codes"), "upgrade_codes"),
    (rel("web_tool"), "web_tool"),
]

# Add collected mypyc datas
datas.extend(extra_datas)

# Offline model cache can be >1GB. Only include if explicitly requested.
if INCLUDE_OFFLINE_MODELS and (project_root / "models").exists():
    datas.append((rel("models"), "models"))


a = Analysis(
    [rel("run_server.py")],
    pathex=[str(project_root)],
    binaries=extra_binaries,
    datas=datas,
    hiddenimports=extra_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="open-llm-vtuber-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="open-llm-vtuber-backend",
)


