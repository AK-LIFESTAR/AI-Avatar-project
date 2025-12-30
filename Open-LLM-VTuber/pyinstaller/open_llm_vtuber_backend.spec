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

project_root = Path(__file__).resolve().parents[1]

block_cipher = None


def rel(p: str) -> str:
    return str((project_root / p).resolve())

INCLUDE_OFFLINE_MODELS = os.environ.get("OPEN_LLM_VTUBER_INCLUDE_OFFLINE_MODELS", "0") == "1"

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

# Offline model cache can be >1GB. Only include if explicitly requested.
if INCLUDE_OFFLINE_MODELS and (project_root / "models").exists():
    datas.append((rel("models"), "models"))


a = Analysis(
    [rel("run_server.py")],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=[],
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


