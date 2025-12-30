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
import sys
import glob
import site
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

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
# BRUTE FORCE: Find ALL mypyc compiled extensions in site-packages
# These have names like '3c22db458360489351e4__mypyc.cp311-win_amd64.pyd'
# =============================================================================
extra_binaries = []
extra_datas = []
extra_hiddenimports = []

# Find all site-packages directories
site_packages_dirs = site.getsitepackages() + [site.getusersitepackages()]
site_packages_dirs = [d for d in site_packages_dirs if d and os.path.isdir(d)]

print("=" * 60)
print("Searching for mypyc modules in site-packages...")
print("=" * 60)

for sp_dir in site_packages_dirs:
    # Find ALL .pyd/.so files with 'mypyc' in the name (the compiled mypyc extensions)
    for ext in ['*.pyd', '*.so']:
        pattern = os.path.join(sp_dir, '**', f'*mypyc*{ext.replace("*", "")}')
        mypyc_files = glob.glob(pattern, recursive=True)
        for mypyc_file in mypyc_files:
            # Get relative path within site-packages
            rel_path = os.path.relpath(mypyc_file, sp_dir)
            dest_dir = os.path.dirname(rel_path) or '.'
            print(f"  Found mypyc binary: {rel_path}")
            extra_binaries.append((mypyc_file, dest_dir))

    # Also find mypyc files at the root of packages (not in subdirs)
    for ext in ['*.pyd', '*.so']:
        pattern = os.path.join(sp_dir, f'*__mypyc*{ext.replace("*", "")}')
        mypyc_files = glob.glob(pattern)
        for mypyc_file in mypyc_files:
            basename = os.path.basename(mypyc_file)
            print(f"  Found mypyc binary (root): {basename}")
            extra_binaries.append((mypyc_file, '.'))

print(f"Total mypyc binaries found: {len(extra_binaries)}")
print("=" * 60)

# =============================================================================
# Also collect all packages that are known to use mypyc
# =============================================================================
mypyc_packages = ['tomli', 'black', 'mypy', 'mypyc']

for pkg in mypyc_packages:
    try:
        pkg_datas, pkg_binaries, pkg_hiddenimports = collect_all(pkg)
        extra_datas.extend(pkg_datas)
        extra_binaries.extend(pkg_binaries)
        extra_hiddenimports.extend(pkg_hiddenimports)
        print(f"Collected {pkg}: {len(pkg_datas)} datas, {len(pkg_binaries)} binaries, {len(pkg_hiddenimports)} hiddenimports")
    except Exception as e:
        print(f"Skipping {pkg}: {e}")

# Also collect all submodules from key packages that may have complex imports
for pkg in ['uvicorn', 'starlette', 'fastapi', 'pydantic', 'pydantic_core', 'anthropic', 'openai', 'httpx', 'httpcore', 'mcp']:
    try:
        subs = collect_submodules(pkg)
        extra_hiddenimports.extend(subs)
        print(f"Collected {len(subs)} submodules from {pkg}")
    except Exception as e:
        print(f"Skipping submodules for {pkg}: {e}")

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

# Add collected datas
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


