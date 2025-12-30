param(
  [string]$PythonExe = "python",
  # Where to copy the built backend payload for the Electron installer
  [string]$ElectronBackendDist = "..\\Open-LLM-VTuber-Web\\backend-dist"
)

$ErrorActionPreference = "Stop"

Write-Host "== Open-LLM-VTuber Windows backend build ==" -ForegroundColor Cyan

# Move to backend repo root (this script lives in ./scripts)
$BackendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $BackendRoot

Write-Host "Backend root: $BackendRoot"

& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install --upgrade wheel setuptools
& $PythonExe -m pip install --upgrade pyinstaller

# Install backend dependencies.
#
# NOTE:
# - requirements.txt is generated from pyproject, but includes a pinned torch version that may not
#   have Windows wheels at the time of building.
# - For CI stability, we install all requirements EXCEPT torch, then install torch from the official
#   PyTorch CPU wheel index.
#
Write-Host "Installing backend dependencies from requirements.txt (excluding torch)..." -ForegroundColor Cyan

$ReqPath = Join-Path $BackendRoot "requirements.txt"
if (!(Test-Path $ReqPath)) {
  throw "requirements.txt not found at: $ReqPath"
}

$ReqWin = Join-Path $BackendRoot "requirements.win-ci.txt"
Get-Content $ReqPath |
  Where-Object { $_ -notmatch '^\s*torch==' } |
  Set-Content -Path $ReqWin -Encoding utf8

& $PythonExe -m pip install -r $ReqWin

Write-Host "Installing torch (CPU wheels)..." -ForegroundColor Cyan
& $PythonExe -m pip install --index-url https://download.pytorch.org/whl/cpu torch

# Our current config uses silero_vad; ensure it's installed even if requirements.txt wasn't updated.
Write-Host "Installing silero-vad..." -ForegroundColor Cyan
& $PythonExe -m pip install silero-vad

# CRITICAL: Reinstall tomli from SOURCE (not wheel) to avoid mypyc bundling issues
# The mypyc-compiled tomli has hash-named modules that PyInstaller can't detect
Write-Host "Reinstalling tomli from source (avoiding mypyc)..." -ForegroundColor Cyan
& $PythonExe -m pip uninstall -y tomli 2>$null
& $PythonExe -m pip install tomli --no-binary tomli

# Debug: Show what mypyc files exist
Write-Host "Checking for mypyc files in site-packages..." -ForegroundColor Yellow
& $PythonExe -c "import site, glob, os; [print(f) for sp in site.getsitepackages() for f in glob.glob(os.path.join(sp, '**', '*mypyc*'), recursive=True)]"

Write-Host "Running PyInstaller..." -ForegroundColor Cyan
# Help the spec file locate the backend root reliably.
$env:OPEN_LLM_VTUBER_BACKEND_ROOT = $BackendRoot.Path
& $PythonExe -m PyInstaller .\\pyinstaller\\open_llm_vtuber_backend.spec --noconfirm --clean

$BuiltDir = Join-Path $BackendRoot "dist\\open-llm-vtuber-backend"
if (!(Test-Path $BuiltDir)) {
  throw "Build output not found: $BuiltDir"
}

$TargetDir = Resolve-Path (Join-Path $BackendRoot $ElectronBackendDist) -ErrorAction SilentlyContinue
if (!$TargetDir) {
  $TargetDir = Join-Path $BackendRoot $ElectronBackendDist
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
} else {
  $TargetDir = $TargetDir.Path
}

Write-Host "Copying backend payload to: $TargetDir" -ForegroundColor Cyan

# Clear old files (except README if present)
Get-ChildItem -Path $TargetDir -Force | Where-Object { $_.Name -ne "README.txt" } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Copy-Item -Path (Join-Path $BuiltDir "*") -Destination $TargetDir -Recurse -Force

Write-Host "✅ Done. Now build the Windows installer in Open-LLM-VTuber-Web:" -ForegroundColor Green
Write-Host "   cd ..\\Open-LLM-VTuber-Web" -ForegroundColor Green
Write-Host "   npm install" -ForegroundColor Green
Write-Host "   npm run build:win" -ForegroundColor Green


